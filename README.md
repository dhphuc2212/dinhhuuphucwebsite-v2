# Đinh Hữu Phúc — Website cá nhân (dinhhuuphuc.com)

Dự án chia nhỏ theo từng file để dễ chỉnh sửa, bảo trì và triển khai miễn phí trên **GitHub + Cloudflare Workers / Static Assets**.

## Các mục BẠN CẦN CHỦ ĐỘNG CAN THIỆP sau khi giải nén & đẩy lên GitHub

1. **Thêm `GEMINI_API_KEY` trên Cloudflare Worker:**
   - Lấy API Key miễn phí tại Google AI Studio.
   - Vào **Cloudflare Dashboard -> Workers & Pages -> dinhhuuphucwebsite -> Settings -> Variables and Secrets**, thêm biến bí mật `GEMINI_API_KEY` (chọn Encrypt/Secret).
2. **Cấu hình `GOOGLE_CLIENT_ID` trong `js/calendar.js`:**
   - Tạo OAuth 2.0 Client ID (Web application) trên Google Cloud Console (bật **Google Calendar API**).
   - Khai báo Authorized JavaScript origins: `https://dinhhuuphuc.com` và `https://www.dinhhuuphuc.com`.
   - Dán Client ID vào biến `GOOGLE_CLIENT_ID` trong `js/calendar.js`.
3. **Cập nhật liên kết mạng xã hội & ảnh đại diện trong `sections/about.html`:**
   - Tìm các thẻ có ghi chú `[BẠN CẦN ĐIỀN]` để cập nhật link Facebook, Instagram, X hoặc ảnh chân dung.
