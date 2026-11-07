import { $, $$, api, esc, t, contactForm } from '/assets/app.js';
const jobs = await api('/api/jobs');
let dept = '';
const depts = [...new Set(jobs.map(j => j.department))];
function render() {
  $('#tabs').innerHTML = [['', t('all_dept')], ...depts.map(d => [d, d])].map(([v, l]) => `<button data-v="${esc(v)}" class="${v === dept ? 'on' : ''}">${esc(l)}</button>`).join('');
  $('#jobs').innerHTML = jobs.filter(j => !dept || j.department === dept).map(j => `<div class="job" data-id="${j.id}">
    <div><h3>${esc(j.title)}</h3><div class="meta"><b>${esc(j.department)}</b> • ${esc(j.location)}</div></div>
    <span class="tag">${esc(j.type)}</span></div>`).join('') || '<p class="empty">Hiện chưa có vị trí nào.</p>';
}
$('#tabs').onclick = e => { if (e.target.dataset.v === undefined) return; dept = e.target.dataset.v; render(); };
$('#jobs').onclick = e => {
  const el = e.target.closest('.job'); if (!el) return;
  const j = jobs.find(x => x.id === +el.dataset.id);
  $('#dlgBody').innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px"><h2 style="font-size:30px">${esc(j.title)}</h2><button class="btn sm" data-close>✕</button></div>
    <div class="meta"><b>${esc(j.department)}</b> • ${esc(j.location)} • ${esc(j.type)}</div>
    <div class="jd">${esc(j.description)}</div><h3 style="margin-top:20px" data-i18n="apply"></h3><div id="apply"></div>`;
  contactForm($('#apply'), { kind: 'job', jobId: j.id });
  $('#dlg').showModal();
};
$('#dlg').onclick = e => e.target.matches('[data-close]') && $('#dlg').close();
addEventListener('langchange', render);
render();
