# Google Login — LocalPress

## Cấu hình local

1. Trong Google Cloud / Google Auth Platform, tạo OAuth client loại **Web application**.
2. Thêm Authorized JavaScript origin `http://localhost:5173`. Đây là GIS popup callback bằng JavaScript; không dùng route redirect OAuth của Spring.
3. Nếu ứng dụng đang Testing, thêm tài khoản thử nghiệm khi Google yêu cầu.
4. Trong `frontend/.env.local`, thêm `VITE_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com`, giữ `VITE_USE_MOCK_API=false`.
5. Trong môi trường chạy backend (IDE Run Configuration hoặc terminal), đặt cùng `GOOGLE_CLIENT_ID`. Không cần Google client secret cho luồng GIS ID token này.
6. Đặt `LOCALPRESS_JWT_SECRET` thành chuỗi ngẫu nhiên ít nhất 32 byte UTF-8. Nếu thiếu, local dev tự sinh key tạm; restart sẽ vô hiệu token cũ. Deployment phải đặt key ổn định từ secret manager.
7. Khởi động backend với MySQL đúng cấu hình; Flyway tự chạy migration `V3__add_google_user_identities.sql`. Khởi động lại Vite sau khi đổi env.

Ví dụ PowerShell (thay client ID trước khi chạy; không commit secret):

```powershell
$env:GOOGLE_CLIENT_ID = '<client-id>.apps.googleusercontent.com'
$env:LOCALPRESS_JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
# Chạy backend trong cùng terminal, hoặc cấu hình biến tương ứng trong IDE.
```

Nút Google hiện trên trang `/login` khi API thật và có `VITE_GOOGLE_CLIENT_ID`.
Đăng nhập email/mật khẩu bằng Basic Auth vẫn hoạt động.

## Luồng và hợp đồng

- `GET /api/v1/auth/google/nonce`: trả nonce và cookie HttpOnly, SameSite=Lax, hạn 5 phút. Frontend gửi `credentials: include`.
- GIS nhận nonce, trả Google ID token qua callback. Frontend chỉ gửi token vào `POST /api/v1/auth/google` JSON `{ "idToken": "..." }`, cùng cookie nonce.
- Backend kiểm tra chữ ký RS256, issuer Google, audience/azp, exp/iat, email_verified, sub và nonce. Nonce khớp cookie, chưa dùng và chưa hết hạn mới được chấp nhận.
- Response: `{ "accessToken": "...", "tokenType": "Bearer", "expiresIn": 3600 }`. Token LocalPress chỉ nằm trong memory; reload hoặc logout cần đăng nhập lại. Không có refresh token trong phiên bản này.
- Frontend gọi `/api/v1/auth/me` với Bearer. Backend đọc role và trạng thái khóa từ DB trên mỗi request. JWT không dùng role do frontend cung cấp.
- Lần đầu tạo `READER/ACTIVE`, password hash ngẫu nhiên không được công khai. Liên kết Google bằng `(provider, sub)`, không bằng email.
- Email đã có tài khoản local: `409`, hướng dẫn dùng cách đăng nhập cũ. Luồng liên kết tài khoản chủ động chưa nằm trong tính năng này.
- `401`: token/nonce không hợp lệ hoặc hết hạn; `403`: tài khoản khóa; `503`: thiếu cấu hình hoặc không truy cập được khóa Google.

Nonce hiện được lưu trong memory, tối đa 10.000 nonce đồng thời. Khi chạy nhiều backend instance cần dùng kho TTL chung (ví dụ Redis) và giới hạn tần suất ở ingress.
FE và API phải cùng site (ví dụ `news.example.com` và `api.example.com`); dùng HTTPS ngoài localhost để cookie Secure hoạt động. Không trộn `localhost` và `127.0.0.1`. Reverse proxy phải cung cấp scheme HTTPS tin cậy cho ứng dụng.

## Kiểm tra thủ công

1. Tài khoản Google mới: đăng nhập, `/auth/me` trả READER, DB có một user và một identity.
2. Đăng xuất rồi đăng nhập lại: không tạo thêm user; email local trùng nhận thông báo xung đột.
3. Khóa user trong DB: Bearer hiện tại và lần đăng nhập tiếp theo đều bị từ chối.
4. Gửi lại credential đã dùng: nonce bị từ chối. Sửa token hoặc audience: 401.
5. Mở bài Free trong cửa sổ ẩn danh vẫn đọc được. Tài khoản Google READER không truy cập được API backoffice.
6. Basic Auth seed accounts vẫn gọi `/auth/me` và upload ảnh như trước.

## Tài liệu

- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://developers.google.com/identity/gsi/web/reference/js-reference
