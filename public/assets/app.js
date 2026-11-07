// Phần dùng chung mọi trang: menu, footer, song ngữ VI/EN, cookie, form liên hệ, hiệu ứng cuộn.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDate = d => new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
export const ph = (label, h, img) => `<div class="ph" style="--h:${h}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `[${esc(label)}]`}</div>`;
export async function api(path, opt = {}) {
  const r = await fetch(path, { ...opt, headers: { 'Content-Type': 'application/json' }, body: opt.body && JSON.stringify(opt.body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'Lỗi ' + r.status), { status: r.status, data });
  return data;
}

// ---------- song ngữ ----------
const DICT = {
  en: {
    home: 'Home', creators: 'For Creators', commerce: 'Social Commerce', blog: 'Blog', careers: 'Careers', contact: 'Get In Touch',
    company: 'COMPANY', menu: 'MENU', follow: 'FOLLOW US', reach: 'REACH US', privacy: 'Privacy', terms: 'Terms of Use',
    cookie: 'By continuing to use this site you agree to our <a href="/privacy">Personal Data Policy</a> and the use of cookies.', agree: 'Agree',
    f_email: 'EMAIL *', f_channel: 'YOUR CHANNEL LINK *', f_phone: 'PHONE *', f_msg: 'TELL US YOUR CONCERN', f_kind: 'YOU ARE', f_name: 'FULL NAME *',
    f_consent: 'I agree to the personal data policy', submit: 'SUBMIT', sent: 'Thanks! We will get back to you soon.',
    ready: 'Ready to create...', bypassion: 'BY PASSION?', orsend: 'Or send an email to...',
    k_creator: 'Creator', k_brand: 'Brand', k_partner: 'Partner', all: 'All posts', related: 'Related posts', featured: 'FEATURED', latest: 'Latest',
    apply: 'Apply now', open_roles: 'Open positions', all_dept: 'All teams', read_more: 'Read more', join: 'Join now',
  },
  vi: {
    home: 'Trang chủ', creators: 'Cho Creator', commerce: 'Social Commerce', blog: 'Blog', careers: 'Tuyển dụng', contact: 'Liên hệ',
    company: 'CÔNG TY', menu: 'MENU', follow: 'THEO DÕI', reach: 'LIÊN HỆ', privacy: 'Bảo mật', terms: 'Điều khoản',
    cookie: 'Khi tiếp tục sử dụng trang này, bạn đồng ý với <a href="/privacy">Chính sách xử lý dữ liệu cá nhân</a> và việc sử dụng cookies.', agree: 'Đồng ý',
    f_email: 'EMAIL *', f_channel: 'LINK KÊNH CỦA BẠN *', f_phone: 'SỐ ĐIỆN THOẠI *', f_msg: 'BẠN CẦN HỖ TRỢ GÌ?', f_kind: 'BẠN LÀ', f_name: 'HỌ TÊN *',
    f_consent: 'Tôi đồng ý với chính sách dữ liệu cá nhân', submit: 'GỬI', sent: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.',
    ready: 'Sẵn sàng sáng tạo...', bypassion: 'BẰNG ĐAM MÊ?', orsend: 'Hoặc gửi email tới...',
    k_creator: 'Creator', k_brand: 'Brand', k_partner: 'Đối tác', all: 'Tất cả', related: 'Bài liên quan', featured: 'NỔI BẬT', latest: 'Mới nhất',
    apply: 'Ứng tuyển', open_roles: 'Vị trí đang tuyển', all_dept: 'Tất cả phòng ban', read_more: 'Xem thêm', join: 'Tham gia ngay',
  },
};
export let lang = (() => { try { return localStorage.lang || 'vi'; } catch { return 'vi'; } })();
export const t = k => DICT[lang][k] ?? k;
// data-i18n="key" lấy từ DICT; data-en="..." cho câu riêng của từng trang (bản VI là nội dung gốc trong HTML)
function applyLang() {
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => el.innerHTML = t(el.dataset.i18n));
  $$('[data-en]').forEach(el => { el.dataset.vi ??= el.innerHTML; el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.vi; });
  $('.lang') && ($('.lang').innerHTML = lang === 'en' ? '<b>EN</b> / VI' : '<b>VI</b> / EN');
}

// ---------- khung trang ----------
const NAV = [['/', 'home'], ['/for-creators', 'creators'], ['/social-commerce', 'commerce'], ['/blog', 'blog'], ['/careers', 'careers']];
function layout() {
  const here = location.pathname.replace(/\/$/, '') || '/';
  document.body.insertAdjacentHTML('afterbegin', `
  <nav class="nav" id="nav">
    <a href="/" class="logo">vyra<span>.</span></a>
    <ul>${NAV.map(([h, k]) => `<li><a href="${h}" class="${here === h || (h !== '/' && here.startsWith(h)) ? 'on' : ''}" data-i18n="${k}"></a></li>`).join('')}</ul>
    <div class="right">
      <button class="lang" aria-label="Đổi ngôn ngữ"></button>
      <a href="/contact" class="btn fill cta-btn" data-i18n="contact"></a>
      <button class="burger" aria-label="Menu">☰</button>
    </div>
  </nav>`);
  document.body.insertAdjacentHTML('beforeend', `
  <footer>
    <div class="wrap fgrid">
      <div><h4 class="mono" data-i18n="company"></h4><li><b style="color:var(--text)">VYRA Network</b></li><li>[Địa chỉ văn phòng — minh hoạ]</li></div>
      <div><h4 class="mono" data-i18n="menu"></h4>${NAV.map(([h, k]) => `<li><a href="${h}" data-i18n="${k}"></a></li>`).join('')}</div>
      <div><h4 class="mono" data-i18n="follow"></h4><li><a href="#">Facebook</a></li><li><a href="#">Instagram</a></li><li><a href="#">YouTube</a></li><li><a href="#">TikTok</a></li></div>
      <div><h4 class="mono" data-i18n="reach"></h4><li>Creator: support@vyra.example</li><li>Brand: booking@vyra.example</li><li>Hotline: 0000 000 000</li></div>
    </div>
    <div class="wrap copy"><span>© ${new Date().getFullYear()} VYRA. All Rights Reserved.</span><span><a href="/privacy" data-i18n="privacy"></a> · <a href="/terms" data-i18n="terms"></a></span></div>
    <div class="big" aria-hidden="true">vyra.</div>
  </footer>`);
  let seen; try { seen = localStorage.cookieOk; } catch {}
  if (!seen) {
    document.body.insertAdjacentHTML('beforeend', `<div class="cookie"><span data-i18n="cookie"></span><button class="btn fill" data-i18n="agree"></button></div>`);
    $('.cookie button').onclick = () => { $('.cookie').remove(); try { localStorage.cookieOk = 1; } catch {} };
  }
  $('.burger').onclick = () => $('#nav').classList.toggle('open');
  $('.lang').onclick = () => { lang = lang === 'en' ? 'vi' : 'en'; try { localStorage.lang = lang; } catch {} applyLang(); dispatchEvent(new Event('langchange')); };
}

// ---------- form liên hệ (dùng ở mọi trang qua <div data-contact>) ----------
export function contactForm(el, { kind, jobId } = {}) {
  const job = kind === 'job';
  el.innerHTML = `<form class="form" novalidate>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    ${job ? `<label data-i18n="f_name"></label><input name="name" required><div class="err" data-for="name"></div>` :
    `<label data-i18n="f_kind"></label><select name="kind">${['creator', 'brand', 'partner'].map(k => `<option value="${k}" ${k === kind ? 'selected' : ''} data-i18n="k_${k}"></option>`).join('')}</select>`}
    <label data-i18n="f_email"></label><input name="email" type="email" placeholder="example@gmail.com" required><div class="err" data-for="email"></div>
    ${job ? '' : `<label data-i18n="f_channel"></label><input name="channel" placeholder="https://youtube.com/@kenh" required><div class="err" data-for="channel"></div>`}
    <label data-i18n="f_phone"></label><input name="phone" type="tel" placeholder="0901 234 567" required><div class="err" data-for="phone"></div>
    <label data-i18n="f_msg"></label><textarea name="message" rows="4"></textarea>
    <label class="check"><input type="checkbox" required> <span data-i18n="f_consent"></span></label>
    <div class="row"><button class="btn fill" data-i18n="submit"></button><span class="msg" role="status"></span></div>
  </form>`;
  applyLang();
  const f = $('form', el), msg = $('.msg', f);
  f.onsubmit = async e => {
    e.preventDefault();
    $$('.err', f).forEach(x => x.textContent = '');
    if (!$('.check input', f).checked) { msg.className = 'msg bad'; msg.textContent = '⚠ ' + t('f_consent'); return; }
    const body = Object.fromEntries(new FormData(f));
    if (job) Object.assign(body, { kind: 'job', job_id: jobId });
    const btn = $('button', f); btn.disabled = true;
    try {
      await api('/api/contact', { method: 'POST', body });
      f.reset(); msg.className = 'msg ok'; msg.textContent = t('sent');
    } catch (err) {
      msg.className = 'msg bad'; msg.textContent = err.message;
      Object.entries(err.data?.errors || {}).forEach(([k, v]) => { const x = $(`[data-for="${k}"]`, f); if (x) x.textContent = v; });
    } finally { btn.disabled = false; }
  };
}
// khối "live by passion" + form, giống cuối mỗi trang của bản gốc
export function contactSection(el) {
  el.innerHTML = `<section><div class="wrap"><div class="contact-box grid2">
    <div><div class="eyebrow mono">create boldly.</div><h2><span data-i18n="ready"></span><br><span class="grad" data-i18n="bypassion"></span></h2>
      <p class="muted" data-i18n="orsend"></p><p style="margin-top:12px">Creator: <a class="grad" href="mailto:support@vyra.example">support@vyra.example</a><br>Brand: <a class="grad" href="mailto:booking@vyra.example">booking@vyra.example</a></p></div>
    <div data-form></div></div></div></section>`;
  contactForm($('[data-form]', el), { kind: new URLSearchParams(location.search).get('kind') || 'creator' });
}

// ---------- hiệu ứng: hiện dần khi cuộn + đếm số ----------
function count(el) {
  const end = +el.dataset.count, dec = +(el.dataset.dec || 0), t0 = performance.now();
  const step = now => { const k = Math.min((now - t0) / 1600, 1); el.textContent = (end * (1 - (1 - k) ** 3)).toFixed(dec); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); $$('[data-count]', e.target).forEach(count); io.unobserve(e.target);
}), { threshold: .12 });
export const reveal = (root = document) => $$('.rv:not(.in)', root).forEach(el => io.observe(el));

layout();
$$('[data-contact-section]').forEach(contactSection);
applyLang();
reveal();
export { applyLang };
