// trang admin không dùng app.js để khỏi chèn menu/footer công khai
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function api(path, opt = {}) {
  const r = await fetch(path, { ...opt, headers: { 'Content-Type': 'application/json' }, body: opt.body && JSON.stringify(opt.body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/api/admin/login') { loginView(); throw new Error(d.error); }
  if (!r.ok) throw new Error(d.error || 'Lỗi ' + r.status);
  return d;
}
const date = d => d.slice(0, 16).replace('T', ' ');

function loginView(err = '') {
  $('#app').innerHTML = `<form class="form card login" id="lf"><a href="/" class="logo" style="font-size:28px;font-weight:700">vyra<span style="color:var(--a1)">.</span> admin</a>
    <label>MẬT KHẨU</label><input type="password" name="password" autofocus required>
    <div class="row"><button class="btn fill">Đăng nhập</button><span class="msg bad">${esc(err)}</span></div></form>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    try { await api('/api/admin/login', { method: 'POST', body: { password: e.target.password.value } }); dash(); }
    catch (x) { loginView(x.message); }
  };
}

// cấu hình form cho từng bảng: [field, nhãn, kiểu]
const FIELDS = {
  posts: [['title', 'Tiêu đề *'], ['category', 'Danh mục *', 'list'], ['slug', 'Slug (để trống = tự tạo)'], ['cover', 'Link ảnh bìa'],
    ['excerpt', 'Tóm tắt', 'area'], ['body', 'Nội dung (cách đoạn bằng 1 dòng trống)', 'area'], ['tags', 'Tags (phân cách dấu phẩy)'],
    ['featured', 'Bài nổi bật', 'check'], ['published', 'Xuất bản', 'check']],
  jobs: [['title', 'Vị trí *'], ['department', 'Phòng ban *'], ['location', 'Địa điểm'], ['type', 'Loại hình'],
    ['description', 'Mô tả', 'area'], ['open', 'Đang tuyển', 'check']],
};
const CATS = ['Tin công ty', 'Góc nhìn ngành', 'Sự kiện', 'Câu chuyện Creator'];
let tab = 'posts', rows = [], kindFilter = '';

async function dash() {
  const s = await api('/api/admin/stats');
  $('#app').innerHTML = `<div class="top"><a href="/" class="logo">vyra<span style="color:var(--a1)">.</span> admin</a><button class="btn sm" id="out">Đăng xuất</button></div>
    <div class="kpis">${[['Bài viết', s.posts], ['Vị trí đang tuyển', s.jobs], ['Liên hệ', s.contacts], ['Chưa đọc', s.unread]].map(([k, v]) => `<div class="card"><span class="muted">${k}</span><b>${v}</b></div>`).join('')}</div>
    <div class="tabs" id="tabs">${[['posts', 'Bài viết'], ['jobs', 'Tuyển dụng'], ['contacts', 'Liên hệ & ứng tuyển']].map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="pane"></div>`;
  $('#out').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }); loginView(); };
  $('#tabs').onclick = e => { if (e.target.dataset.t) { tab = e.target.dataset.t; dash(); } };
  rows = await api('/api/admin/' + tab);
  tab === 'contacts' ? contactsView() : listView();
}

function listView() {
  const cols = tab === 'posts' ? [['title', 'Tiêu đề'], ['category', 'Danh mục'], ['created_at', 'Ngày']] : [['title', 'Vị trí'], ['department', 'Phòng ban'], ['location', 'Địa điểm']];
  const flag = tab === 'posts' ? 'published' : 'open';
  $('#pane').innerHTML = `<button class="btn fill" id="add" style="margin-bottom:16px">+ Thêm mới</button><div class="scroll"><table>
    <tr>${cols.map(c => `<th>${c[1]}</th>`).join('')}<th>Trạng thái</th><th></th></tr>
    ${rows.map(r => `<tr>${cols.map(([k]) => `<td>${esc(k === 'created_at' ? date(r[k]) : r[k])}</td>`).join('')}
      <td><span class="pill ${r[flag] ? 'new' : ''}">${r[flag] ? (tab === 'posts' ? 'Đã đăng' : 'Đang mở') : (tab === 'posts' ? 'Nháp' : 'Đã đóng')}</span>${r.featured ? ' ⭐' : ''}</td>
      <td style="white-space:nowrap">${tab === 'posts' && r.published ? `<a class="btn sm" href="/blog/${encodeURIComponent(r.slug)}" target="_blank">Xem</a>` : ''}<button class="btn sm" data-edit="${r.id}">Sửa</button><button class="btn sm danger" data-del="${r.id}">Xoá</button></td></tr>`).join('')}
  </table></div>`;
  $('#add').onclick = () => editor();
  $('#pane').onclick = async e => {
    const { edit, del } = e.target.dataset;
    if (edit) editor(rows.find(r => r.id === +edit));
    if (del && confirm('Xoá vĩnh viễn mục này? Không thể hoàn tác.')) { await api(`/api/admin/${tab}/${del}`, { method: 'DELETE' }); dash(); }
  };
}

function editor(row = { published: 1, open: 1, type: 'Full-time' }) {
  const f = FIELDS[tab];
  $('#dlg').innerHTML = `<form class="form" id="ef"><h2 style="font-size:28px">${row.id ? 'Sửa' : 'Thêm'} ${tab === 'posts' ? 'bài viết' : 'vị trí'}</h2>
    <datalist id="cats">${CATS.map(c => `<option>${c}</option>`).join('')}</datalist>
    ${f.map(([k, l, type]) => type === 'check' ? `<label class="check" style="margin-top:16px"><input type="checkbox" name="${k}" ${row[k] ? 'checked' : ''}> ${l}</label>`
      : `<label>${l}</label>${type === 'area' ? `<textarea name="${k}" rows="${k === 'body' || k === 'description' ? 10 : 3}">${esc(row[k])}</textarea>`
      : `<input name="${k}" value="${esc(row[k])}" ${type === 'list' ? 'list="cats"' : ''} ${l.includes('*') ? 'required' : ''}>`}`).join('')}
    <div class="row"><button class="btn fill">Lưu</button><button type="button" class="btn" data-close>Huỷ</button><span class="msg bad"></span></div></form>`;
  $('#dlg').showModal();
  $('#ef [data-close]').onclick = () => $('#dlg').close();
  $('#ef').onsubmit = async e => {
    e.preventDefault();
    const body = Object.fromEntries(f.map(([k, , type]) => [k, type === 'check' ? e.target[k].checked : e.target[k].value]));
    try {
      await api(`/api/admin/${tab}${row.id ? '/' + row.id : ''}`, { method: row.id ? 'PUT' : 'POST', body });
      $('#dlg').close(); dash();
    } catch (x) { $('#ef .msg').textContent = x.message; }
  };
}

function contactsView() {
  const KIND = { creator: 'Creator', brand: 'Brand', partner: 'Đối tác', job: 'Ứng tuyển' };
  const list = rows.filter(r => !kindFilter || r.kind === kindFilter);
  $('#pane').innerHTML = `<div class="tabs">${[['', 'Tất cả'], ...Object.entries(KIND)].map(([k, l]) => `<button data-k="${k}" class="${k === kindFilter ? 'on' : ''}">${l}</button>`).join('')}
    <button id="csv" class="btn sm" style="margin-left:auto">⬇ Xuất CSV</button></div>
    <div class="scroll"><table><tr><th>Ngày</th><th>Loại</th><th>Liên hệ</th><th>Nội dung</th><th>Trạng thái</th><th></th></tr>
    ${list.map(r => `<tr><td>${date(r.created_at)}</td><td>${KIND[r.kind]}${r.job_id ? ' #' + r.job_id : ''}</td>
      <td>${esc(r.name)}<br><a class="grad" href="mailto:${esc(r.email)}">${esc(r.email)}</a><br>${esc(r.phone)}${r.channel ? `<br><a href="${esc(/^https?:/.test(r.channel) ? r.channel : '#')}" target="_blank" rel="noopener" class="muted">${esc(r.channel)}</a>` : ''}</td>
      <td style="max-width:320px;white-space:pre-line">${esc(r.message) || '<span class="muted">—</span>'}</td>
      <td><select data-st="${r.id}" class="pill ${r.status}" style="background:var(--bg);color:inherit">${[['new', 'Mới'], ['read', 'Đã xem'], ['done', 'Đã xử lý']].map(([v, l]) => `<option value="${v}" ${v === r.status ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><button class="btn sm danger" data-del="${r.id}">Xoá</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Chưa có liên hệ.</td></tr>'}
    </table></div>`;
  $('#pane').onclick = async e => {
    if (e.target.dataset.k !== undefined) { kindFilter = e.target.dataset.k; contactsView(); }
    if (e.target.dataset.del && confirm('Xoá vĩnh viễn liên hệ này? Không thể hoàn tác.')) { await api('/api/admin/contacts/' + e.target.dataset.del, { method: 'DELETE' }); dash(); }
    if (e.target.id === 'csv') {
      const cols = ['created_at', 'kind', 'name', 'email', 'phone', 'channel', 'message', 'status'];
      const csv = [cols, ...list.map(r => cols.map(c => r[c] ?? ''))].map(l => l.map(v => `"${String(v).replace(/^[=@]/, "'$&").replace(/"/g, '""')}"`) /* chặn công thức Excel từ dữ liệu người gửi */.join(',')).join('\n');
      Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: 'lien-he.csv' }).click();
    }
  };
  $('#pane').onchange = async e => { if (e.target.dataset.st) { await api('/api/admin/contacts/' + e.target.dataset.st, { method: 'PATCH', body: { status: e.target.value } }); dash(); } };
}

api('/api/admin/me').then(dash, () => {});
