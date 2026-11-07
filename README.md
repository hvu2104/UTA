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
npm start          # http://localhost:3000, admin: /admin (mật khẩu mặc định admin123)
npm test
```

Biến môi trường: `PORT`, `ADMIN_PASSWORD` (**bắt buộc đặt khi deploy**), `DB_FILE` (đường dẫn file database).

## Deploy (Render)
1. New → Web Service → chọn repo này. Build command: để trống. Start command: `npm start`.
2. Environment: thêm `ADMIN_PASSWORD`.
3. Muốn dữ liệu không mất khi redeploy: gắn Persistent Disk (gói trả phí), mount ở `/data` và đặt `DB_FILE=/data/data.db`. Gói free sẽ reset database mỗi lần deploy/ngủ.

Ảnh và chữ hiện là minh hoạ — thay ảnh bằng link ảnh bìa trong admin, hoặc sửa trực tiếp trong `public/`.
