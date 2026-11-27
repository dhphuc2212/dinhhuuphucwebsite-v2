export function handleStaticPages(pathname) {
  if (pathname === "/privacy") {
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chính sách quyền riêng tư — Đinh Hữu Phúc</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; line-height: 1.65; margin: 0; padding: 32px 16px; }
    .card { max-width: 760px; margin: 0 auto; background: #111114; border: 1px solid #27272a; border-radius: 16px; padding: 32px; }
    h1 { font-size: 1.6rem; margin-top: 0; color: #10b981; }
    h2 { font-size: 1.1rem; margin-top: 24px; color: #fafafa; }
    p, li { color: #a1a1aa; font-size: 0.96rem; }
    a { color: #10b981; text-decoration: none; font-weight: 500; }
    .meta { font-size: 0.85rem; color: #71717a; margin-bottom: 20px; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Chính sách quyền riêng tư (Privacy Policy)</h1>
    <div class="meta">Cập nhật lần cuối: 24/11/2026 • Website: dinhhuuphuc.com</div>
    <h2>1. Dữ liệu chúng tôi truy cập</h2>
    <p>Khi bạn chủ động nhấn nút <strong>"Đăng nhập với Google để xem lịch"</strong> trên website <strong>dinhhuuphuc.com</strong>, ứng dụng chỉ yêu cầu các quyền tối thiểu gồm:</p>
    <ul>
      <li><strong>Thông tin hồ sơ cơ bản (Email, Tên hiển thị):</strong> dùng để hiển thị đúng tài khoản Google đang kết nối trên giao diện.</li>
      <li><strong>Google Calendar (calendar.events):</strong> dùng để đọc danh sách sự kiện sắp tới và thêm sự kiện lịch làm việc mới theo yêu cầu trực tiếp của bạn.</li>
    </ul>
    <h2>2. Cách thức lưu trữ và bảo mật</h2>
    <p>Nếu bạn chọn <strong>"Duy trì đăng nhập trong 60 ngày"</strong>, phiên làm việc được duy trì tối đa 60 ngày để bạn không phải đăng nhập lại mỗi lần mở máy. Website <strong>không</strong> lưu trữ mật khẩu và không chia sẻ dữ liệu lịch cá nhân của bạn cho bất kỳ bên thứ ba nào.</p>
    <h2>3. Quyền kiểm soát và thu hồi quyền truy cập</h2>
    <p>Bạn có thể nhấn <strong>"Đăng xuất"</strong> ngay trên trang web bất cứ lúc nào hoặc thu hồi quyền truy cập tại <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.</p>
    <h2>4. Thông tin liên hệ</h2>
    <p>Liên hệ cá nhân: <a href="mailto:dhphuc2212@dinhhuuphuc.com">dhphuc2212@dinhhuuphuc.com</a> hoặc <a href="mailto:dhphuc2212@gmail.com">dhphuc2212@gmail.com</a> • <a href="/">Quay lại trang chủ</a>.</p>
  </main>
</body>
</html>`;
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (pathname === "/terms") {
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Điều khoản dịch vụ — Đinh Hữu Phúc</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; line-height: 1.65; margin: 0; padding: 32px 16px; }
    .card { max-width: 760px; margin: 0 auto; background: #111114; border: 1px solid #27272a; border-radius: 16px; padding: 32px; }
    h1 { font-size: 1.6rem; margin-top: 0; color: #10b981; }
    h2 { font-size: 1.1rem; margin-top: 24px; color: #fafafa; }
    p, li { color: #a1a1aa; font-size: 0.96rem; }
    a { color: #10b981; text-decoration: none; font-weight: 500; }
    .meta { font-size: 0.85rem; color: #71717a; margin-bottom: 20px; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Điều khoản dịch vụ (Terms of Service)</h1>
    <div class="meta">Cập nhật lần cuối: 24/11/2026 • Website: dinhhuuphuc.com</div>
    <h2>1. Mục đích sử dụng</h2>
    <p>Website <strong>dinhhuuphuc.com</strong> cung cấp thông tin cá nhân, thông tin sản phẩm Gạo Ông Du, mini-game và công cụ trợ lý AI hỗ trợ sắp xếp lịch làm việc lên Google Calendar cá nhân.</p>
    <h2>2. Trách nhiệm người dùng</h2>
    <ul>
      <li>Người dùng tự chịu trách nhiệm đối với nội dung sự kiện được tạo và lưu vào tài khoản Google Calendar của mình.</li>
      <li>Không sử dụng trợ lý AI hoặc các biểu mẫu trên trang vào mục đích spam, phá hoại hay vi phạm pháp luật.</li>
    </ul>
    <h2>3. Giới hạn trách nhiệm</h2>
    <p>Thông tin gợi ý từ trợ lý AI chỉ mang tính hỗ trợ bóc tách thời gian nhanh; người dùng vui lòng kiểm tra lại tiêu đề, ngày và khung giờ trước khi nhấn xác nhận lưu vào Google Calendar.</p>
    <h2>4. Thông tin liên hệ</h2>
    <p>Liên hệ cá nhân: <a href="mailto:dhphuc2212@dinhhuuphuc.com">dhphuc2212@dinhhuuphuc.com</a> • Liên hệ công việc (Gạo Ông Du): <a href="mailto:info@gaoongdu.vn">info@gaoongdu.vn</a> • <a href="/">Quay lại trang chủ</a>.</p>
  </main>
</body>
</html>`;
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  return null;
}
