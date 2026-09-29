# Chuẩn bị chuyển LIMIT SPORTSWEAR sang Netlify

Project hiện tại đã có cấu hình build Netlify. Bản này bổ sung adapter PostgreSQL, schema khởi tạo, nút tải bản sao dữ liệu trong khu kế toán và công cụ nhập an toàn. Site ChatGPT hiện tại vẫn tiếp tục dùng Cloudflare D1 cho đến khi chuyển và xác minh xong.

## Tài nguyên cần có trên Netlify

- Một database PostgreSQL được quản lý, kết nối bằng `DATABASE_URL` hoặc biến `NETLIFY_DB_URL` do Netlify Database cấp. Netlify Database phụ thuộc gói tài khoản và mức sử dụng; có thể dùng dịch vụ PostgreSQL khác nếu phù hợp hơn.
- Netlify environment variables `ADMIN_PASSWORD` và `ADMIN_SESSION_TOKEN`. Đặt `ADMIN_PASSWORD` bằng mật khẩu hiện tại đã biết của chủ cửa hàng; sau lần đăng nhập đầu và đổi mật khẩu, hash mới được lưu trong database. Tạo `ADMIN_SESSION_TOKEN` ngẫu nhiên dài tối thiểu 32 bytes.
- Đặt ba biến này qua giao diện Netlify và bảo đảm chúng có quyền truy cập runtime Functions; không ghi giá trị bí mật vào `netlify.toml` hoặc Git.
- Cấu hình domain/URL Netlify sau khi kiểm tra deploy preview và nhập dữ liệu.

Không đưa các giá trị trên vào Git, file cấu hình công khai hoặc tài liệu này.

## Quy trình chuyển dữ liệu

1. Đăng nhập vào khu kế toán trên site hiện tại, bấm **Tải bản sao dữ liệu** và giữ tệp JSON ở nơi riêng tư. Tệp chứa dữ liệu cửa hàng và thông tin khách hàng.
2. Tạo/kết nối PostgreSQL, cấu hình `DATABASE_URL` (hoặc dùng `NETLIFY_DB_URL`), `ADMIN_PASSWORD`, và `ADMIN_SESSION_TOKEN` trong Netlify UI, rồi chạy build/deploy thử trên một URL preview.
3. Kiểm tra tệp sao lưu trước khi nhập:

   ```sh
   node scripts/migrate-netlify-db.mjs /đường/dẫn/limit-sportswear-backup.json --dry-run
   ```

4. Chạy nhập một lần vào database rỗng:

   ```sh
   DATABASE_URL='(lấy từ secret manager của bạn)' node scripts/migrate-netlify-db.mjs /đường/dẫn/limit-sportswear-backup.json
   ```

   Lệnh từ chối ghi nếu đã có hàng dữ liệu ứng dụng trong database, nhằm tránh ghi đè.
5. Đăng nhập vào URL Netlify preview, đối chiếu tổng số đơn, thu chi, sản phẩm, tồn kho và lịch sử; thử tạo một bản ghi thử rồi xóa nó.
6. Chỉ sau khi đối chiếu đạt mới chuyển domain/người dùng sang Netlify. Giữ site cũ làm bản dự phòng cho đến khi xác nhận vận hành ổn định.

## Kiểm tra hiện trạng

- `netlify.toml` dùng Next.js runtime và Node 22.
- Migration PostgreSQL nằm trong `netlify/database/migrations/`, đúng quy ước deploy của Netlify và tách khỏi thư mục `drizzle/` của Cloudflare D1.
- `next.config.ts` chọn adapter PostgreSQL khi Netlify build; build Sites giữ nguyên adapter D1. Runtime đọc `DATABASE_URL` hoặc `NETLIFY_DB_URL`.
- Dữ liệu hoạt động tiếp tục nằm trong một hàng `app_state` có version compare-and-swap để giữ nguyên cách chống ghi đè đồng thời.
- Không xuất hoặc nhập hash đăng nhập D1. Mật khẩu được đặt lại bằng secret Netlify, sau đó chức năng đổi mật khẩu của web lưu hash trong PostgreSQL.
- Việc chuyển domain và cấu hình Netlify cần quyền truy cập tài khoản Netlify/nhà cung cấp database; bước chuẩn bị này chưa thay đổi site đang hoạt động.
