// VYRA Network — server Node thuần: trang tĩnh + API + admin, dữ liệu SQLite (node:sqlite, Node >= 22.13).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { seed } from './seed.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, 'public');
const PORT = +process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // đổi bằng biến môi trường khi deploy
if (!process.env.ADMIN_PASSWORD) console.warn('⚠ ADMIN_PASSWORD chưa đặt, đang dùng mật khẩu mặc định "admin123"');

export const db = new DatabaseSync(process.env.DB_FILE || path.join(ROOT, 'data.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL,
  excerpt TEXT DEFAULT '', body TEXT DEFAULT '', cover TEXT DEFAULT '', tags TEXT DEFAULT '', featured INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, department TEXT NOT NULL, location TEXT DEFAULT '',
  type TEXT DEFAULT 'Full-time', description TEXT DEFAULT '', open INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS contacts(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, name TEXT DEFAULT '', email TEXT NOT NULL,
  phone TEXT DEFAULT '', channel TEXT DEFAULT '', message TEXT DEFAULT '', job_id INTEGER, status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now')));`);
if (!db.prepare('SELECT COUNT(*) n FROM posts').get().n) seed(db);

// ---------- helpers ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const send = (res, code, data, headers = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(data));
};
const readBody = req => new Promise((ok, bad) => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 1e6) { bad(new Error('too large')); req.destroy(); } });
  req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { bad(new Error('bad json')); } });
});
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const slugify = s => str(s, 200).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'post-' + Date.now();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// phiên admin: token ngẫu nhiên giữ trong RAM. shortcut: restart server là đăng xuất hết, chuyển sang bảng sessions nếu chạy nhiều instance
const sessions = new Map();
const SESSION_MS = 8 * 3600e3;
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p[0]));
const isAdmin = req => { const t = cookie(req).sid, exp = t && sessions.get(t); return exp > Date.now(); };
const samePass = p => { const a = Buffer.from(String(p)), b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b); };

// chống spam form: tối đa 5 lần / 10 phút / IP. shortcut: bộ đếm trong RAM, đủ cho 1 instance
const hits = new Map();
const limited = ip => { const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 600e3);
  arr.push(now); hits.set(ip, arr); return arr.length > 5; };

// ---------- API ----------
const postCols = 'id,slug,title,category,excerpt,cover,tags,featured,created_at';
function postInput(b) {
  const title = str(b.title, 200), category = str(b.category, 60);
  if (!title || !category) return null;
  return { title, category, slug: slugify(b.slug || title), excerpt: str(b.excerpt, 500), body: str(b.body, 50000),
    cover: str(b.cover, 500), tags: str(b.tags, 200), featured: b.featured ? 1 : 0, published: b.published === false ? 0 : 1 };
}
function jobInput(b) {
  const title = str(b.title, 200), department = str(b.department, 80);
  if (!title || !department) return null;
  return { title, department, location: str(b.location, 120), type: str(b.type, 40) || 'Full-time',
    description: str(b.description, 20000), open: b.open === false ? 0 : 1 };
}
const upsert = (table, data, id) => {
  const keys = Object.keys(data);
  if (id) db.prepare(`UPDATE ${table} SET ${keys.map(k => k + '=?').join(',')} WHERE id=?`).run(...Object.values(data), id);
  else id = db.prepare(`INSERT INTO ${table}(${keys}) VALUES(${keys.map(() => '?')})`).run(...Object.values(data)).lastInsertRowid;
  return db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
};

async function api(req, res, url) {
  const p = url.pathname, m = req.method, q = url.searchParams;

  // --- công khai ---
  if (m === 'GET' && p === '/api/posts') {
    const cat = q.get('category'), page = Math.max(1, +q.get('page') || 1), size = Math.min(30, +q.get('size') || 9);
    const where = 'WHERE published=1' + (cat ? ' AND category=?' : ''), args = cat ? [cat] : [];
    const total = db.prepare(`SELECT COUNT(*) n FROM posts ${where}`).get(...args).n;
    const items = db.prepare(`SELECT ${postCols} FROM posts ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...args, size, (page - 1) * size);
    const featured = db.prepare(`SELECT ${postCols} FROM posts WHERE published=1 AND featured=1 ORDER BY created_at DESC LIMIT 5`).all();
    const categories = db.prepare('SELECT category, COUNT(*) n FROM posts WHERE published=1 GROUP BY category').all();
    return send(res, 200, { items, total, page, pages: Math.ceil(total / size), featured, categories });
  }
  let r;
  if (m === 'GET' && (r = p.match(/^\/api\/posts\/([\w-]+)$/))) {
    const post = db.prepare('SELECT * FROM posts WHERE slug=? AND published=1').get(r[1]);
    if (!post) return send(res, 404, { error: 'Không tìm thấy bài viết' });
    const related = db.prepare(`SELECT ${postCols} FROM posts WHERE published=1 AND category=? AND id!=? ORDER BY created_at DESC LIMIT 4`)
      .all(post.category, post.id);
    return send(res, 200, { post, related });
  }
  if (m === 'GET' && p === '/api/jobs')
    return send(res, 200, db.prepare('SELECT * FROM jobs WHERE open=1 ORDER BY created_at DESC, id DESC').all());

  if (m === 'POST' && p === '/api/contact') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    if (limited(ip)) return send(res, 429, { error: 'Bạn gửi quá nhiều, thử lại sau ít phút.' });
    const b = await readBody(req);
    if (b.website) return send(res, 200, { ok: true }); // honeypot: bot điền ô ẩn thì bỏ qua
    const kind = ['creator', 'brand', 'partner', 'job'].includes(b.kind) ? b.kind : 'creator';
    const c = { kind, name: str(b.name, 120), email: str(b.email, 200), phone: str(b.phone, 30), channel: str(b.channel, 300),
      message: str(b.message, 5000), job_id: kind === 'job' ? (+b.job_id || null) : null };
    const errors = {};
    if (!EMAIL.test(c.email)) errors.email = 'Email không hợp lệ';
    if (kind !== 'job' && !c.channel) errors.channel = 'Cần link kênh';
    if (!/^[+\d][\d\s.-]{7,}$/.test(c.phone)) errors.phone = 'Số điện thoại không hợp lệ';
    if (kind === 'job' && !c.name) errors.name = 'Cần họ tên';
    if (Object.keys(errors).length) return send(res, 400, { error: 'Thông tin chưa hợp lệ', errors });
    upsert('contacts', c);
    return send(res, 201, { ok: true });
  }

  // --- admin ---
  if (m === 'POST' && p === '/api/admin/login') {
    const b = await readBody(req);
    if (!samePass(b.password)) return send(res, 401, { error: 'Sai mật khẩu' });
    const t = crypto.randomBytes(32).toString('hex');
    sessions.set(t, Date.now() + SESSION_MS);
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return send(res, 200, { ok: true }, { 'Set-Cookie': `sid=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${secure}` });
  }
  if (m === 'POST' && p === '/api/admin/logout') {
    sessions.delete(cookie(req).sid);
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0' });
  }
  if (p.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return send(res, 401, { error: 'Chưa đăng nhập' });
    if (m === 'GET' && p === '/api/admin/me') return send(res, 200, { ok: true });
    if (m === 'GET' && p === '/api/admin/stats') return send(res, 200, {
      posts: db.prepare('SELECT COUNT(*) n FROM posts').get().n, jobs: db.prepare('SELECT COUNT(*) n FROM jobs WHERE open=1').get().n,
      contacts: db.prepare('SELECT COUNT(*) n FROM contacts').get().n, unread: db.prepare("SELECT COUNT(*) n FROM contacts WHERE status='new'").get().n });

    const crud = { posts: postInput, jobs: jobInput };
    if ((r = p.match(/^\/api\/admin\/(posts|jobs|contacts)(?:\/(\d+))?$/))) {
      const [, table, id] = r;
      if (m === 'GET' && !id) return send(res, 200, db.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC, id DESC`).all());
      if (m === 'DELETE' && id) { db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id); return send(res, 200, { ok: true }); }
      if (table === 'contacts' && m === 'PATCH' && id) {
        const b = await readBody(req);
        if (!['new', 'read', 'done'].includes(b.status)) return send(res, 400, { error: 'Trạng thái không hợp lệ' });
        return send(res, 200, upsert('contacts', { status: b.status }, id));
      }
      if (crud[table] && (m === 'POST' && !id || m === 'PUT' && id)) {
        const data = crud[table](await readBody(req));
        if (!data) return send(res, 400, { error: 'Thiếu tiêu đề hoặc danh mục' });
        try { return send(res, id ? 200 : 201, upsert(table, data, id)); }
        catch (e) { if (/UNIQUE/.test(e.message)) return send(res, 409, { error: 'Slug đã tồn tại' }); throw e; }
      }
    }
  }
  send(res, 404, { error: 'Not found' });
}

// ---------- trang ----------
// URL đẹp → file html. /blog/<slug> và /careers/<id> dùng chung 1 trang, JS tự gọi API.
const ROUTES = { '/': 'index', '/for-creators': 'for-creators', '/social-commerce': 'social-commerce', '/blog': 'blog',
  '/contact': 'contact', '/careers': 'careers', '/privacy': 'privacy', '/terms': 'terms', '/admin': 'admin' };
function page(res, p) {
  const name = ROUTES[p.replace(/\/$/, '') || '/'] || (/^\/blog\/[\w-]+$/.test(p) && 'post');
  let file = name ? path.join(PUB, name + '.html') : path.join(PUB, path.normalize(p));
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    return fs.createReadStream(path.join(PUB, '404.html')).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else page(res, decodeURIComponent(url.pathname));
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, /json|large/.test(e.message) ? 400 : 500, { error: 'Yêu cầu không hợp lệ' });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(ROOT, 'server.js'))
  server.listen(PORT, () => console.log(`VYRA chạy tại http://localhost:${PORT}  (admin: /admin)`));
