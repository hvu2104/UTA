# VYRA Network

Website creator network (clone tính năng của metub.net, đổi tên + giao diện). Node.js thuần, không cần cài thư viện.

## Tính năng
- **Trang công khai:** Trang chủ, Cho Creator, Social Commerce (mô phỏng gắn sản phẩm), Blog (lọc danh mục, phân trang, bài nổi bật), bài viết chi tiết + bài liên quan, Tuyển dụng (lọc phòng ban, ứng tuyển), Liên hệ, Bảo mật, Điều khoản, 404.
- **Song ngữ VI/EN**, banner cookie, form liên hệ có kiểm tra dữ liệu + chống spam.
- **Admin `/admin`:** đăng nhập bằng mật khẩu, quản lý bài viết (nháp/xuất bản/nổi bật), tin tuyển dụng, xem liên hệ & đơn ứng tuyển (đổi trạng thái, xuất CSV).
- Dữ liệu lưu trong SQLite (`data.db`, tự tạo + nạp dữ liệu mẫu lần đầu chạy).

## Chạy local
Cần Node.js >= 22.13.

```bash
npm start          # http://localhost:3000, admin: /admin (không đặt ADMIN_PASSWORD thì server in mật khẩu tạm ra terminal)
npm test
```

Biến môi trường:

| Biến | Ý nghĩa |
|---|---|
| `NODE_ENV=production` | Bật chế độ chạy thật: server **từ chối khởi động** nếu thiếu `ADMIN_PASSWORD` hoặc ngắn hơn 12 ký tự |
| `ADMIN_PASSWORD` | Mật khẩu admin (bắt buộc khi deploy) |
| `TRUST_PROXY=1` | Đặt khi chạy sau hosting/reverse proxy để lấy đúng IP người dùng và nhận biết HTTPS |
| `DB_FILE` | Đường dẫn file database, ví dụ `/data/data.db` |
| `PORT` | Cổng, mặc định 3000 |

## Bảo mật
- **SQL injection:** mọi giá trị đi qua câu lệnh tham số hoá (`?`); tên bảng/cột chỉ lấy từ whitelist trong code.
- **XSS:** dữ liệu được escape trước khi chèn vào HTML; link ảnh/link kênh chỉ nhận `http(s)`; CSP `script-src 'self'` chặn mọi script inline (toàn bộ JS nằm trong `public/assets/`).
- **CSRF:** cookie `SameSite=Strict` + API ghi dữ liệu chỉ nhận JSON và chặn `Origin` khác domain.
- **Đăng nhập admin:** so sánh mật khẩu thời gian hằng, khoá 15 phút sau 10 lần sai/IP, cookie `HttpOnly` (+ `Secure` khi HTTPS), phiên hết hạn sau 8 giờ.
- **Chống spam:** form liên hệ tối đa 5 lần/10 phút/IP + ô honeypot ẩn.
- **Header:** CSP, HSTS (khi HTTPS), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy; chặn path traversal và file ẩn.
- **Không có secret trong code:** mật khẩu chỉ lấy từ biến môi trường; `.env` bị gitignore.
- **Rate limit sau proxy:** với `TRUST_PROXY=1` chỉ tin IP cuối trong `X-Forwarded-For` (do hosting ghi), không thể giả IP để vượt giới hạn.
- **Database:** file DB chỉ chủ sở hữu đọc/ghi (`600`); API công khai dùng kết nối **read-only**; file DB nằm ngoài thư mục `public/`.
- **Lỗi:** người dùng chỉ thấy câu chung chung, chi tiết chỉ ghi ở log server; body > 1MB trả 413. Không bật CORS.
- `npm test` gồm các test SQL injection, XSS, CSRF, brute-force (kể cả giả IP), lộ lỗi, CORS.

## Deploy (Render)
1. New → Web Service → chọn repo này. Build command: để trống. Start command: `npm start`.
2. Environment: thêm `NODE_ENV=production`, `TRUST_PROXY=1`, `ADMIN_PASSWORD`.
3. Muốn dữ liệu không mất khi redeploy: gắn Persistent Disk (gói trả phí), mount ở `/data` và đặt `DB_FILE=/data/data.db`. Gói free sẽ reset database mỗi lần deploy/ngủ.

Ảnh và chữ hiện là minh hoạ — thay ảnh bằng link ảnh bìa trong admin, hoặc sửa trực tiếp trong `public/`.
