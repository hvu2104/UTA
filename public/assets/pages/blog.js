import { $, $$, api, esc, ph, fmtDate, t } from '/assets/app.js';
const params = new URLSearchParams(location.search);
let cat = params.get('category') || '', page = +params.get('page') || 1, cats;

const meta = p => `<div class="meta"><b>${esc(p.category)}</b> • ${fmtDate(p.created_at)}</div>`;
const card = (p, i) => `<a href="/blog/${encodeURIComponent(p.slug)}" class="post">${ph('thumbnail', 200 + (p.id * 23) % 160, p.cover)}<h3>${esc(p.title)}</h3>${meta(p)}<p>${esc(p.excerpt)}</p></a>`;

async function load() {
  const d = await api(`/api/posts?page=${page}${cat ? '&category=' + encodeURIComponent(cat) : ''}`);
  cats ??= d.categories.map(c => c.category);
  $('#tabs').innerHTML = [['', t('all')], ...cats.map(c => [c, c])].map(([v, l]) => `<button data-v="${esc(v)}" class="${v === cat ? 'on' : ''}">${esc(l)}</button>`).join('');
  // khối nổi bật chỉ hiện ở trang 1, tab "Tất cả" như bản gốc
  $('#featWrap').hidden = !!cat || page > 1 || !d.featured.length;
  if (!$('#featWrap').hidden) {
    const [m, ...rest] = d.featured;
    $('#feat').innerHTML = `<a href="/blog/${encodeURIComponent(m.slug)}" class="post main">${ph('ảnh nổi bật', 190, m.cover)}${meta(m)}<h3 style="font-size:30px;margin-top:8px">${esc(m.title)}</h3><p>${esc(m.excerpt)}</p></a>
      <div class="side">${rest.map(p => `<a href="/blog/${encodeURIComponent(p.slug)}" class="post">${ph('', 220 + p.id * 20, p.cover)}<div>${meta(p)}<h3>${esc(p.title)}</h3></div></a>`).join('')}</div>`;
  }
  $('#posts').innerHTML = d.items.map(card).join('') || '<p class="empty">Chưa có bài viết.</p>';
  $('#pager').innerHTML = d.pages > 1 ? Array.from({ length: d.pages }, (_, i) => `<button class="${i + 1 === page ? 'on' : ''}">${i + 1}</button>`).join('') : '';
  history.replaceState(null, '', '?' + new URLSearchParams({ ...(cat && { category: cat }), ...(page > 1 && { page }) }));
}
$('#tabs').onclick = e => { if (e.target.dataset.v === undefined) return; cat = e.target.dataset.v; page = 1; load(); };
$('#pager').onclick = e => { if (e.target.tagName !== 'BUTTON') return; page = +e.target.textContent; load(); scrollTo({ top: 0 }); };
addEventListener('langchange', load);
load();
