import { $, $$, api, esc, ph, fmtDate, reveal } from '/assets/app.js';

const names = 'ABCDEFGHIJ'.split('').map(c => 'Creator ' + c);
const card = (n, i) => `<div class="creator ph" style="--h:${(i * 37) % 360}">[ảnh ${n}]<span class="tag">@${n.replace(' ', '').toLowerCase()}</span></div>`;
$('#t1').innerHTML = [...names, ...names].map(card).join('');
$('#t2').innerHTML = [...names, ...names].reverse().map(card).join('');

const verts = ['MUSIC', 'GAMING', 'SPORT', 'FOOD & TRAVEL', 'LIFESTYLE', 'FASHION & BEAUTY'];
$('#vlist').innerHTML = verts.map((v, i) => `<a href="/for-creators" class="vrow"><span class="n mono">[0${i + 1}]</span><span class="t">${v}</span><div class="peek ph" style="--h:${i * 55}">[${v.toLowerCase()}]</div></a>`).join('');

const cases = [['Chiến dịch A', 'Brand X'], ['Chiến dịch B', 'Brand Y'], ['Chiến dịch C', 'Brand Z'], ['Chiến dịch D', 'Brand W']];
$('#slides').innerHTML = cases.map((c, i) => `<div class="slide">${ph('ảnh case study: ' + c[0], 150 + i * 40)}<div class="cap">VYRA Network <i>×</i> ${c[1]}</div></div>`).join('');
$('#dots').innerHTML = cases.map((_, i) => `<button aria-label="Slide ${i + 1}"></button>`).join('');
let cur = 0; const dots = [...$('#dots').children];
const go = i => { cur = i; $('#slides').style.transform = `translateX(-${i * 100}%)`; dots.forEach((d, j) => d.classList.toggle('on', j === i)); };
dots.forEach((d, i) => d.onclick = () => go(i)); go(0);
setInterval(() => go((cur + 1) % cases.length), 4000);
const logos = ['BRAND ONE', 'Logoipsum', 'ACME', 'Nova Co.', 'Lumen', 'Brand Six', 'Orbit'];
$('#logos').innerHTML = [...logos, ...logos].map(l => `<span>${l}</span>`).join('');

const { items } = await api('/api/posts?size=6');
$('#posts').innerHTML = items.map((p, i) => `<a href="/blog/${encodeURIComponent(p.slug)}" class="post rv">${ph('thumbnail', 200 + i * 25, p.cover)}<h3>${esc(p.title)}</h3><div class="meta"><b>${esc(p.category)}</b> • ${fmtDate(p.created_at)}</div></a>`).join('');
reveal();
