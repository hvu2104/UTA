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
const PROD = process.env.NODE_ENV === 'production';
const TRUST_PROXY = process.env.TRUST_PROXY === '1'; // chỉ bật khi chạy sau reverse proxy (hosting), nếu không IP/HTTPS có thể bị giả
// không có mật khẩu mặc định trong code: thiếu biến môi trường thì production dừng, local tự sinh mật khẩu ngẫu nhiên mỗi lần chạy
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (PROD && ADMIN_PASSWORD.length < 12) {
  console.error('✖ Chạy production cần ADMIN_PASSWORD dài tối thiểu 12 ký tự.');
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  ADMIN_PASSWORD = crypto.randomBytes(12).toString('base64url');
  console.warn(`⚠ ADMIN_PASSWORD chưa đặt — mật khẩu admin tạm cho lần chạy này: ${ADMIN_PASSWORD}`);
}

const DB_FILE = process.env.DB_FILE || path.join(process.env.DATA_DIR || ROOT, 'data.db'); // hosting đặt DATA_DIR=/data (ổ bền)
export const db = new DatabaseSync(DB_FILE);
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
const onDisk = DB_FILE !== ':memory:';
if (onDisk) try { fs.chmodSync(DB_FILE, 0o600); } catch {} // chỉ user chạy server được đọc/ghi file DB (Windows bỏ qua)
// API công khai chỉ đọc dùng kết nối read-only: lỗ hổng ở phần công khai cũng không sửa/xoá được dữ liệu
const ro = onDisk ? new DatabaseSync(DB_FILE, { readOnly: true }) : db;

// ---------- helpers ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const send = (res, code, data, headers = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(data));
};
const MAX_BODY = 1e6;
const readBody = req => new Promise((ok, bad) => {
  if (+req.headers['content-length'] > MAX_BODY) return bad(new Error('too large'));
  let s = '', over = false;
  req.on('data', c => { if (over) return; s += c; if (s.length > MAX_BODY) { over = true; s = ''; bad(new Error('too large')); } });
  req.on('end', () => {
    try { const v = s ? JSON.parse(s) : {}; v && typeof v === 'object' && !Array.isArray(v) ? ok(v) : bad(new Error('bad json')); }
    catch { bad(new Error('bad json')); }
  });
});
const str = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').trim().slice(0, max);
const int = (v, def, min, max) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const slugify = s => str(s, 200).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'post-' + Date.now();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// phiên admin: token ngẫu nhiên giữ trong RAM. shortcut: restart server là đăng xuất hết, chuyển sang bảng sessions nếu chạy nhiều instance
const sessions = new Map();
const SESSION_MS = 8 * 3600e3;
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p[0]));
const isAdmin = req => {
  const t = cookie(req).sid, exp = t && sessions.get(t);
  if (exp && exp <= Date.now()) sessions.delete(t);
  return exp > Date.now();
};
// so sánh qua hash cùng độ dài để không lộ độ dài mật khẩu qua thời gian phản hồi
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const samePass = p => !!ADMIN_PASSWORD && crypto.timingSafeEqual(sha(p), sha(ADMIN_PASSWORD));

// giới hạn tần suất theo IP. shortcut: bộ đếm trong RAM, đủ cho 1 instance; nhiều instance thì chuyển sang Redis
const hits = new Map();
const limited = (key, max, windowMs) => {
  const now = Date.now(), arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now); hits.set(key, arr); return arr.length > max;
};
setInterval(() => { // dọn bộ đếm và phiên hết hạn để không phình RAM
  const now = Date.now();
  for (const [k, arr] of hits) if (now - arr[arr.length - 1] > 3600e3) hits.delete(k);
  for (const [t, exp] of sessions) if (exp <= now) sessions.delete(t);
}, 600e3).unref();
// Header chứa IP thật, tuỳ hosting. Sau Cloudflare dùng CLIENT_IP_HEADER=cf-connecting-ip (Cloudflare ghi đè, client không giả được).
// Với X-Forwarded-For lấy IP CUỐI (proxy ghi vào); IP đầu do người dùng tự gửi được → dùng nó thì vượt rate limit.
const IP_HEADER = (process.env.CLIENT_IP_HEADER || 'x-forwarded-for').toLowerCase();
const clientIp = req => {
  const raw = TRUST_PROXY && String(req.headers[IP_HEADER] || '').split(',').pop().trim();
  const ip = raw || req.socket.remoteAddress || '';
  // IPv6: một người thường có cả dải /64 → gom theo 4 nhóm đầu để không đổi địa chỉ lách được giới hạn.
  // shortcut: không mở rộng dạng viết tắt "::", đủ cho địa chỉ thật từ Cloudflare/proxy
  return ip.includes(':') && !ip.startsWith('::ffff:') ? ip.split(':').slice(0, 4).join(':') : ip;
};
const isHttps = req => TRUST_PROXY ? req.headers['x-forwarded-proto'] === 'https' : !!req.socket.encrypted;

// chỉ nhận link http(s) hoặc đường dẫn nội bộ, chặn javascript:/data: lọt vào src/href
const safeUrl = v => { const s = str(v, 500); return /^(https?:\/\/|\/(?!\/))/i.test(s) ? s : ''; };

// ---------- API ----------
const postCols = 'id,slug,title,category,excerpt,cover,tags,featured,created_at';
function postInput(b) {
  const title = str(b.title, 200), category = str(b.category, 60);
  if (!title || !category) return null;
  return { title, category, slug: slugify(b.slug || title), excerpt: str(b.excerpt, 500), body: str(b.body, 50000),
    cover: safeUrl(b.cover), tags: str(b.tags, 200), featured: b.featured ? 1 : 0, published: b.published === false ? 0 : 1 };
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
    const cat = str(q.get('category'), 60), page = int(q.get('page'), 1, 1, 10000), size = int(q.get('size'), 9, 1, 30);
    const where = 'WHERE published=1' + (cat ? ' AND category=?' : ''), args = cat ? [cat] : [];
    const total = ro.prepare(`SELECT COUNT(*) n FROM posts ${where}`).get(...args).n;
    const items = ro.prepare(`SELECT ${postCols} FROM posts ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...args, size, (page - 1) * size);
    const featured = ro.prepare(`SELECT ${postCols} FROM posts WHERE published=1 AND featured=1 ORDER BY created_at DESC LIMIT 5`).all();
    const categories = ro.prepare('SELECT category, COUNT(*) n FROM posts WHERE published=1 GROUP BY category').all();
    return send(res, 200, { items, total, page, pages: Math.ceil(total / size), featured, categories });
  }
  let r;
  if (m === 'GET' && (r = p.match(/^\/api\/posts\/([\w-]+)$/))) {
    const post = ro.prepare('SELECT * FROM posts WHERE slug=? AND published=1').get(r[1]);
    if (!post) return send(res, 404, { error: 'Không tìm thấy bài viết' });
    const related = ro.prepare(`SELECT ${postCols} FROM posts WHERE published=1 AND category=? AND id!=? ORDER BY created_at DESC LIMIT 4`)
      .all(post.category, post.id);
    return send(res, 200, { post, related });
  }
  if (m === 'GET' && p === '/api/jobs')
    return send(res, 200, ro.prepare('SELECT * FROM jobs WHERE open=1 ORDER BY created_at DESC, id DESC').all());

  if (m === 'POST' && p === '/api/contact') {
    if (limited('contact:' + clientIp(req), 5, 600e3)) return send(res, 429, { error: 'Bạn gửi quá nhiều, thử lại sau ít phút.' });
    const b = await readBody(req);
    if (b.website) return send(res, 200, { ok: true }); // honeypot: bot điền ô ẩn thì bỏ qua
    const kind = ['creator', 'brand', 'partner', 'job'].includes(b.kind) ? b.kind : 'creator';
    let channel = str(b.channel, 300);
    if (channel && !/^https?:\/\//i.test(channel)) channel = 'https://' + channel; // người dùng hay gõ thiếu https://
    const c = { kind, name: str(b.name, 120), email: str(b.email, 200), phone: str(b.phone, 30), channel: safeUrl(channel),
      message: str(b.message, 5000), job_id: kind === 'job' ? int(b.job_id, null, 1, 1e9) : null };
    const errors = {};
    if (!EMAIL.test(c.email)) errors.email = 'Email không hợp lệ';
    if (kind !== 'job' && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(c.channel)) errors.channel = 'Link kênh không hợp lệ';
    if (kind === 'job' && !ro.prepare('SELECT 1 FROM jobs WHERE id=? AND open=1').get(c.job_id)) errors.job = 'Vị trí không còn tuyển';
    if (!/^[+\d][\d\s.-]{7,}$/.test(c.phone)) errors.phone = 'Số điện thoại không hợp lệ';
    if (kind === 'job' && !c.name) errors.name = 'Cần họ tên';
    if (Object.keys(errors).length) return send(res, 400, { error: 'Thông tin chưa hợp lệ', errors });
    upsert('contacts', c);
    return send(res, 201, { ok: true });
  }

  // --- admin ---
  if (m === 'POST' && p === '/api/admin/login') {
    const key = 'login:' + clientIp(req);
    if (limited(key, 10, 900e3)) return send(res, 429, { error: 'Thử sai quá nhiều lần, đợi 15 phút.' });
    const b = await readBody(req);
    if (!samePass(b.password)) return send(res, 401, { error: 'Sai mật khẩu' });
    hits.delete(key);
    const t = crypto.randomBytes(32).toString('hex');
    sessions.set(t, Date.now() + SESSION_MS);
    const secure = isHttps(req) ? '; Secure' : '';
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
    // tên bảng chỉ lấy từ whitelist trong regex, tên cột từ postInput/jobInput cố định; mọi giá trị đều đi qua tham số "?"
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
  if (!file.startsWith(PUB + path.sep) || /[\\/]\./.test(file.slice(PUB.length)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    return fs.createReadStream(path.join(PUB, '404.html')).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

// CSP: chỉ chạy script từ chính site (không inline) → kể cả lọt chuỗi độc vào HTML cũng không thực thi được
const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com", "img-src 'self' https: data: blob:", "connect-src 'self'",
  "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');

export const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
      // chống CSRF: request ghi dữ liệu phải là JSON và (nếu trình duyệt gửi Origin) cùng nguồn
      if (req.method !== 'GET') {
        const origin = req.headers.origin;
        if (!/^application\/json\b/i.test(req.headers['content-type'] || '') ||
            (origin && new URL(origin).host !== req.headers.host))
          return send(res, 403, { error: 'Yêu cầu bị chặn' });
      }
      await api(req, res, url);
    } else page(res, decodeURIComponent(url.pathname));
  } catch (e) {
    const client = e instanceof URIError || /json|large|Invalid URL/.test(e.message);
    if (!client) console.error(e);
    if (!res.headersSent) send(res, e.message === 'too large' ? 413 : client ? 400 : 500,
      { error: e.message === 'too large' ? 'Dữ liệu quá lớn' : client ? 'Yêu cầu không hợp lệ' : 'Lỗi máy chủ, thử lại sau' },
      { Connection: 'close' });
  }
});
server.requestTimeout = 30e3; // không để kết nối treo giữ tài nguyên

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(ROOT, 'server.js'))
  server.listen(PORT, '0.0.0.0', () => console.log(`VYRA chạy tại cổng ${PORT}, database: ${DB_FILE}`));
