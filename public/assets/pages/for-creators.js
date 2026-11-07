import { $, $$, ph, reveal } from '/assets/app.js';
const PKGS = {
  'Content & Production': [['Thiết kế & dựng video', 'Nâng tầm thương hiệu kênh, thu hút khán giả bằng hình ảnh nổi bật.'], ['Thư viện nhạc bản quyền', 'Hơn 30.000 bản nhạc, tránh khiếu nại bản quyền và giữ trọn doanh thu.'], ['Tối ưu video', 'Nhắm đúng từ khoá, tăng hiển thị tìm kiếm và tương tác.']],
  'Channel Growth & Safety': [['Bảo vệ bản quyền', 'Quét và xử lý video reup tự động.'], ['Khôi phục kênh', 'Hỗ trợ khi kênh bị hack hoặc gặp sự cố chính sách.'], ['Tư vấn tăng trưởng', 'Phân tích số liệu, gợi ý chiến lược nội dung.']],
  'Affiliate Boost': [['YouTube Shopping', 'Gắn sản phẩm vào video, nhận hoa hồng.'], ['Kho sản phẩm', 'Hàng nghìn sản phẩm từ nhà bán uy tín.'], ['Báo cáo GMV', 'Theo dõi đơn hàng và doanh thu theo thời gian thực.']],
  'Multi-revenue': [['Booking quảng cáo', 'Kết nối brand phù hợp với kênh.'], ['Đa nền tảng', 'Mở rộng sang TikTok, Facebook, Instagram.'], ['Sự kiện & offline', 'Cơ hội tham gia sự kiện, fan meeting.']],
  'Payment & Reports': [['Thanh toán đúng hạn', 'Minh bạch, đúng lịch hằng tháng.'], ['Báo cáo chi tiết', 'Doanh thu theo kênh, video, nguồn.'], ['Hỗ trợ thuế', 'Tư vấn chứng từ và nghĩa vụ thuế.']],
};
const tabs = Object.keys(PKGS);
$('#tabs').innerHTML = tabs.map((k, i) => `<button role="tab" class="${i ? '' : 'on'}">${k}</button>`).join('');
const show = k => { $('#pkgs').innerHTML = PKGS[k].map(([t, d], i) => `<div class="card pkg">${ph(t, 160 + i * 50)}<h3>${t}</h3><p class="muted">${d}</p></div>`).join('');
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.textContent === k)); };
$('#tabs').onclick = e => e.target.tagName === 'BUTTON' && show(e.target.textContent);
show(tabs[0]);

const camp = [['2.3M+', '1.2K+'], ['448.6K+', '29.3M+'], ['321.3K+', '2.5K+'], ['73.1K+', '12.2K+'], ['240.4K+', '3K+']];
$('#camp').innerHTML = camp.map(([g, o], i) => `<div class="card">${ph('chiến dịch ' + (i + 1), 30 + i * 60)}<div class="s"><span class="eyebrow mono">GMV</span><b>${g}</b><span class="eyebrow mono" style="display:block;margin-top:10px">ORDERS</span><b>${o}</b></div></div>`).join('');
reveal();
