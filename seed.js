// Dữ liệu mẫu chạy 1 lần khi database trống. Nội dung chỉ để minh hoạ.
const lorem = t => `Bài “${t}” — đây là nội dung minh hoạ cho bài viết. Thay bằng nội dung thật trong trang quản trị (/admin).\n\nĐoạn thứ hai: VYRA đồng hành cùng creator để bảo vệ, phát triển và kiếm tiền từ kênh một cách bền vững.\n\nTheo dõi VYRA Network để cập nhật công cụ, xu hướng và chính sách nền tảng mới nhất.`;

const posts = [
  ['Sáng tạo của bạn xứng đáng được bảo vệ tốt nhất', 'Tin công ty', 1],
  ['Meta ra mắt huy hiệu xác minh Facebook miễn phí', 'Góc nhìn ngành', 1],
  ['Ask Studio: cung cấp thêm ngữ cảnh', 'Góc nhìn ngành', 1],
  ['Bắt đầu với Ask Studio', 'Góc nhìn ngành', 1],
  ['World Cup 2026 được xem nhiều nhất trên YouTube', 'Góc nhìn ngành', 1],
  ['Báo cáo tác động kinh tế của YouTube', 'Góc nhìn ngành', 0],
  ['Shorts Templates: không cần bắt đầu từ con số 0', 'Góc nhìn ngành', 0],
  ['Ý tưởng Shorts tiếp theo của bạn', 'Góc nhìn ngành', 0],
  ['Cập nhật trải nghiệm xem Shorts', 'Góc nhìn ngành', 0],
  ['5 cách tìm cảm hứng làm Shorts', 'Góc nhìn ngành', 0],
  ['5 tính năng Shorts tăng tương tác', 'Góc nhìn ngành', 0],
  ['Minh bạch nội dung do AI tạo', 'Góc nhìn ngành', 0],
  ['Điểm nhấn YouTube Brandcast 2026', 'Sự kiện', 0],
  ['Creator Partnerships Summit — cập nhật chính', 'Sự kiện', 0],
  ['Phát triển kênh một cách tự tin', 'Tin công ty', 0],
  ['Hệ sinh thái creator của VYRA', 'Tin công ty', 0],
  ['Hành trình 1 triệu subscriber của Creator A', 'Câu chuyện Creator', 0],
  ['Từ đam mê nấu ăn đến nút Vàng', 'Câu chuyện Creator', 0],
];

const jobs = [
  ['Partner Manager', 'Creator Success', 'TP.HCM', 'Full-time'],
  ['Video Editor', 'Production', 'Hà Nội', 'Full-time'],
  ['Social Commerce Executive', 'Commerce', 'TP.HCM', 'Full-time'],
  ['Backend Developer (Node.js)', 'Tech', 'Remote', 'Full-time'],
  ['Thực tập sinh Marketing', 'Marketing', 'TP.HCM', 'Internship'],
];

export function seed(db) {
  const ins = db.prepare(`INSERT INTO posts(slug,title,category,excerpt,body,tags,featured,created_at) VALUES(?,?,?,?,?,?,?,datetime('now',?))`);
  posts.forEach(([title, category, featured], i) => {
    const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    ins.run(slug, title, category, `Tóm tắt minh hoạ cho bài “${title}”.`, lorem(title), 'VYRA,YouTube,Creator', featured, `-${i * 3} days`);
  });
  const j = db.prepare('INSERT INTO jobs(title,department,location,type,description) VALUES(?,?,?,?,?)');
  jobs.forEach(([t, d, l, ty]) => j.run(t, d, l, ty,
    `Mô tả công việc minh hoạ cho vị trí ${t}.\n\nYêu cầu:\n- Đam mê nội dung số\n- Chủ động, làm việc nhóm tốt\n\nQuyền lợi:\n- Lương thưởng cạnh tranh\n- Môi trường trẻ, sáng tạo`));
}
