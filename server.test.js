import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_FILE = ':memory:';
process.env.ADMIN_PASSWORD = 'test-pass';
const { server } = await import('./server.js');
let base;
before(() => new Promise(ok => server.listen(0, () => { base = `http://localhost:${server.address().port}`; ok(); })));
after(() => server.close());

const call = (p, opt = {}) => fetch(base + p, { ...opt, headers: { 'Content-Type': 'application/json', ...opt.headers },
  body: opt.body && JSON.stringify(opt.body) });

test('blog: danh sách, lọc danh mục, chi tiết + bài liên quan', async () => {
  const all = await (await call('/api/posts')).json();
  assert.ok(all.total > 10 && all.items.length === 9 && all.featured.length > 0);
  const ev = await (await call('/api/posts?category=' + encodeURIComponent('Sự kiện'))).json();
  assert.ok(ev.items.every(p => p.category === 'Sự kiện'));
  const one = await (await call('/api/posts/' + all.items[0].slug)).json();
  assert.equal(one.post.slug, all.items[0].slug);
  assert.ok(one.related.every(p => p.id !== one.post.id));
  assert.equal((await call('/api/posts/khong-co')).status, 404);
});

test('form liên hệ: kiểm tra dữ liệu và lưu', async () => {
  const bad = await call('/api/contact', { method: 'POST', body: { email: 'x', phone: '1' } });
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).errors.email);
  const ok = await call('/api/contact', { method: 'POST',
    body: { kind: 'creator', email: 'a@b.co', phone: '0901234567', channel: 'https://youtube.com/@a' } });
  assert.equal(ok.status, 201);
});

test('admin: chặn khi chưa đăng nhập, CRUD sau khi đăng nhập', async () => {
  assert.equal((await call('/api/admin/posts')).status, 401);
  assert.equal((await call('/api/admin/login', { method: 'POST', body: { password: 'sai' } })).status, 401);
  const login = await call('/api/admin/login', { method: 'POST', body: { password: 'test-pass' } });
  const headers = { Cookie: login.headers.get('set-cookie').split(';')[0] };

  const created = await (await call('/api/admin/posts', { method: 'POST', headers,
    body: { title: 'Bài thử Đặc biệt', category: 'Tin công ty', body: 'xin chào' } })).json();
  assert.equal(created.slug, 'bai-thu-dac-biet');
  assert.equal((await call('/api/admin/posts', { method: 'POST', headers, body: { title: 'Bài thử Đặc biệt', category: 'X' } })).status, 409);
  const upd = await (await call('/api/admin/posts/' + created.id, { method: 'PUT', headers,
    body: { ...created, title: 'Đã sửa', published: false } })).json();
  assert.equal(upd.title, 'Đã sửa');
  assert.equal((await call('/api/posts/' + upd.slug)).status, 404); // bản nháp không lộ ra ngoài

  const contacts = await (await call('/api/admin/contacts', { headers })).json();
  assert.ok(contacts.length >= 1);
  assert.equal((await (await call('/api/admin/contacts/' + contacts[0].id, { method: 'PATCH', headers, body: { status: 'done' } })).json()).status, 'done');

  const job = await (await call('/api/admin/jobs', { method: 'POST', headers, body: { title: 'QA', department: 'Tech' } })).json();
  assert.ok((await (await call('/api/jobs')).json()).some(j => j.id === job.id));
  assert.equal((await call('/api/admin/jobs/' + job.id, { method: 'DELETE', headers })).status, 200);

  await call('/api/admin/logout', { method: 'POST', headers });
  assert.equal((await call('/api/admin/posts', { headers })).status, 401);
});

test('trang: route đẹp và 404, chặn path traversal', async () => {
  assert.equal((await fetch(base + '/blog/abc')).status, 200);
  assert.equal((await fetch(base + '/khong-ton-tai')).status, 404);
  assert.equal((await fetch(base + '/..%2Fserver.js')).status, 404);
});
