# Google Login — LocalPress

## Cấu hình local

1. Trong Google Cloud / Google Auth Platform, tạo OAuth client loại **Web application**.
2. Thêm Authorized JavaScript origin `http://localhost:5173`. Đây là GIS popup callback bằng JavaScript; không dùng route redirect OAuth của Spring.
3. Nếu ứng dụng đang Testing, thêm tài khoản thử nghiệm khi Google yêu cầu.
4. Trong `frontend/.env.local`, thêm `VITE_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com`, giữ `VITE_USE_MOCK_API=false`.
5. Nhóm dùng chung Google OAuth client ID `847537323970-evboogid431elvcatmp52ii98jtec0ke.apps.googleusercontent.com` (client ID công khai, không phải secret). Dùng giá trị này cho frontend `VITE_GOOGLE_CLIENT_ID` và backend `GOOGLE_CLIENT_ID`; backend đã có mặc định tương ứng. Không cần Google client secret cho luồng GIS ID token này. Nhờ người quản lý client cập nhật origin/test users nếu cần; không tạo client riêng nếu chưa thống nhất.
6. Profile `dev` dùng khóa ký công khai, cố định trong `application-dev.yml` để token không bị vô hiệu chỉ vì restart. Chỉ dùng khóa này ở máy dev. Khi deploy, chọn profile ngoài `dev` và đặt `LOCALPRESS_JWT_SECRET` ngẫu nhiên ít nhất 32 byte UTF-8, ổn định từ secret manager; thiếu secret thì backend dừng thay vì sinh khóa tạm. Thời hạn mặc định là 24 giờ (`86400000` ms), có thể ghi đè bằng `LOCALPRESS_JWT_EXPIRATION_MS`.
7. Khởi động backend với MySQL đúng cấu hình; Flyway chạy V1–V7, trong đó Google Login là `V7__add_google_user_identities.sql`. V3 thuộc ví/nạp tiền trên main. Khởi động lại Vite sau khi đổi env.

### DB dev đã chạy migration Google V3 trước khi đổi sang V7

Không chạy `flyway repair`, xóa bảng `flyway_schema_history`, drop schema hoặc đổi số version trực tiếp trên DB dùng chung. DB này có lịch sử khác main: V3 cũ là Google, còn V3 mới là ví/nạp tiền. Cách kiểm thử an toàn là tạo một schema thử nghiệm trống, tên riêng, trỏ datasource sang đó và chạy V1–V7. Giữ nguyên DB cũ để bảo toàn dữ liệu. Nếu cần giữ dữ liệu cũ trong DB đã chuẩn hóa migration, phối hợp Leader để sao lưu và lập kế hoạch chuyển dữ liệu; không coi việc đổi tên file là đã nâng cấp được DB cũ.

Ví dụ PowerShell cho khóa môi trường triển khai (sinh một lần và lưu ở secret manager, không sinh lại mỗi lần khởi động; không commit secret):

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
- Response mặc định: `{ "accessToken": "...", "tokenType": "Bearer", "expiresIn": 86400 }`. Token LocalPress chỉ nằm trong memory; reload frontend hoặc logout vẫn cần đăng nhập lại, dù chữ ký token còn hợp lệ qua restart backend. Không có refresh token trong phiên bản này.
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
7. Webhook `/api/v1/finance/webhook/**` không cần LocalPress JWT; thiếu header Authorization hoặc dùng `Apikey ...` vẫn đi qua JWT filter. Controller SePay vẫn phải tự kiểm tra khóa/chữ ký và tính hợp lệ giao dịch. Test probe chỉ kiểm tra security chain, không thay thế kiểm thử thanh toán thật.

## Tài liệu

- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://developers.google.com/identity/gsi/web/reference/js-reference
