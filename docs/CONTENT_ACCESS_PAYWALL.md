# Content Access and Paywall — Iter 2, UC068/UC069

## API và ranh giới tích hợp

Giữ API đọc bài đang dùng: `GET /api/v1/articles/{slug}`. Không thêm endpoint trả toàn văn bỏ qua paywall.
`ReaderArticleServiceImpl` gọi `delivery.service.PaywallEngine` trước khi tạo response.
`SecurityConfig` và luồng thanh toán không thay đổi.

`PaywallEngine.checkCurrentAccess(articleId)` lấy danh tính đã được Spring Security xác thực qua JWT/HTTP Basic.
Không nhận `userId`, `isPremium`, hoặc quyền đọc từ query/body của trình duyệt.
`checkAccess(userId, articleId)` là hợp đồng nội bộ dành cho service, không phải API công khai.

## Quyết định quyền đọc

| Tình huống | Kết quả |
| --- | --- |
| Bài FREE đã xuất bản | Toàn văn, không yêu cầu đăng nhập |
| Bài PREMIUM, khách chưa đăng nhập | Khóa, chỉ trả tối đa 30% preview |
| Tài khoản không tồn tại, bị khóa hoặc đang khóa tạm | Không cấp quyền Premium |
| Có `article_purchases` đúng user/bài, `access_status=ACTIVE` | Toàn văn |
| Có subscription ACTIVE, còn hiệu lực, scope ALL | Toàn văn |
| Có subscription ACTIVE, còn hiệu lực, scope CATEGORY đúng chuyên mục | Toàn văn |
| Gói sai chuyên mục, chưa bắt đầu, hết hạn, PENDING/EXPIRED/CANCELLED | Khóa nếu không có quyền hợp lệ khác |
| Bài chưa xuất bản hoặc đã gỡ | 404 |

Ngày hiệu lực được tính theo `Asia/Ho_Chi_Minh`, bao gồm ngày bắt đầu và ngày kết thúc.
Vai trò quản trị/biên tập không tự động cấp quyền đọc Premium ở API công khai.
Plan INACTIVE ngừng bán mới, không tự thu hồi subscription ACTIVE đã mua.

Khi khóa, response có `isLocked=true`, `content=null`, chỉ có phần xem trước trong `previewContent`.
Khi có quyền, `isLocked=false`, `content` chứa toàn văn của phiên bản **đang xuất bản**.
API đặt `Cache-Control: no-store` và `Vary: Authorization` cho response đọc bài.
Frontend hiện có đã đọc `isLocked` để hiển thị toàn văn hoặc PaywallPrompt.

## Migration V8 và dữ liệu cũ

`V8__add_subscription_plan_scope.sql` thêm hai cột vào `subscription_plans`:

- `access_scope`: ALL/CATEGORY, mặc định ALL để giữ hành vi của gói cũ.
- `category_id`: khóa ngoại tới categories; bắt buộc với CATEGORY, phải NULL với ALL.

Không xóa bài viết, phiên bản UC062, purchase hay subscription.
Sao lưu schema đang dùng trước khi khởi động backend để Flyway áp dụng V8.
Không sửa checksum/migration V1–V7 đã chạy.

UI quản trị phạm vi gói thuộc SV2; luồng checkout và kích hoạt/thu hồi quyền thuộc SV3/SV4.
Engine chỉ đọc quyền: không tự chuyển purchase/subscription PENDING thành ACTIVE.
Mua thành công phải được module nguồn kích hoạt sau PaymentSuccessEvent; hoàn toàn bộ phải thu hồi quyền qua RefundCompletedEvent.

## Kiểm thử

Chạy trong backend:

```powershell
mvn '-Dtest=PaywallEngineTest,ReaderArticleServiceTest,ReaderArticleControllerTest' test
```

Sau migration, dùng hai tài khoản khác nhau để kiểm tra API đọc cùng bài Premium.
Không dùng dữ liệu thanh toán thật chỉ để tạo tình huống kiểm thử.
Đối chiếu JSON/Network: tài khoản chưa có quyền tuyệt đối không nhận phần nội dung bị khóa.
Kiểm thử cả mua lẻ, gói ALL, CATEGORY đúng/sai chuyên mục, hạn gói và trạng thái bị thu hồi.
