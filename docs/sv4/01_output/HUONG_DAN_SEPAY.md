# Hướng dẫn cấu hình SePay để test tiền thật (SV4)

> Mục tiêu: anh quét QR nạp 10.000 ₫ bằng app ngân hàng, tiền vào tài khoản của anh, SePay báo về LocalPress, ví được cộng.
> Làm theo thứ tự. Mọi giá trị bí mật chỉ điền vào `backend/config/application-secrets.yml` (đã `.gitignore`), không gửi qua chat, không commit.

## Vì sao QR hiện tại chưa dùng được

- Ảnh QR là **VietQR động**: bắt buộc truyền số tài khoản (`acc`) và ngân hàng (`bank`); nội dung chuyển khoản là mã đơn do LocalPress truyền vào.
  SePay không tự điền số tài khoản (tài liệu SePay "Tạo & nhúng QR Code").
- LocalPress lấy 2 giá trị đó từ `application-secrets.yml`: `account-number`, `bank-short-name` (`SePayService.generateVietQrUrl`).
  File đang ghi `account-number` chỉ 4 ký tự, nên QR sinh ra trỏ tới một tài khoản không đúng.
- Máy local nằm sau router: SePay không gọi webhook vào `localhost` được. Cần 1 trong 2 đường ở bước 3.

## Bước 1. Kiểm tra tài khoản ngân hàng đã liên kết trên SePay

1. Vào https://my.sepay.vn, chọn mục **Ngân hàng** (tài khoản ngân hàng).
2. Mở tài khoản sẽ nhận tiền. Ghi lại: **số tài khoản đầy đủ**, **ngân hàng**, **tên chủ tài khoản**.
3. Trong **Cấu hình chung** của tài khoản đó: bật **Đồng bộ giao dịch → Tiền vào**. Nếu có **Lọc giao dịch theo từ khóa** thì tắt, hoặc thêm từ khóa `LP` (mọi mã đơn của LocalPress bắt đầu bằng `LP`).

## Bước 2. Điền vào `backend/config/application-secrets.yml`

```yaml
localpress:
  sepay:
    env: production
    bank-code: VCB                    # mã ngân hàng (VCB, MB, TCB, BIDV, ACB...)
    bank-short-name: vietcombank      # tên theo VietQR: vietcombank, mbbank, techcombank, bidv, acb...
    account-number: "<SỐ TÀI KHOẢN ĐẦY ĐỦ ở bước 1>"
    account-name: "<TÊN CHỦ TÀI KHOẢN, IN HOA, KHÔNG DẤU>"
    webhook-api-key: "<giữ nguyên giá trị đang có>"
    api-token: "<token ở bước 3A>"
```

Lưu ý: khóa cũ từng bị đẩy lên GitHub (commit `4d624b6`). Nên tạo `webhook-api-key` mới ở bước 3B và thay vào đây.

## Bước 3. Chọn đường để SePay báo tiền về máy local

### 3A. API token (khuyên dùng, không cài thêm gì)

1. my.sepay.vn → **Cấu hình công ty** → **API Access** → **+ Thêm API** → đặt tên `LocalPress local` → trạng thái **Hoạt động** → **Thêm**.
2. Chép token vào `api-token` ở bước 2.
3. Cách hoạt động: khi khách bấm "Tôi đã chuyển khoản, kiểm tra lại", hoặc kế toán bấm "Đồng bộ từ SePay", backend gọi `GET https://my.sepay.vn/userapi/transactions/list` bằng token này, tìm giao dịch có mã đơn, rồi xử lý **đúng như webhook** (ghi nhật ký nguồn "Đồng bộ API", chống trùng theo id SePay).
4. SePay cho biết token có toàn quyền trên tài khoản công ty (không giới hạn phạm vi), nên chỉ để trong file secrets.

### 3B. Webhook thật qua tunnel (tùy chọn, đúng đường production)

1. Cài cloudflared: `winget install --id Cloudflare.cloudflared`.
2. Backend đang chạy, mở PowerShell ở thư mục repo: `powershell -ExecutionPolicy Bypass -File backend/scripts/sepay-tunnel.ps1` rồi chép địa chỉ `https://....trycloudflare.com` nó in ra.
3. my.sepay.vn → **Webhooks** → **+ Thêm webhooks**:
   - Sự kiện: **Có tiền vào**
   - Tài khoản ngân hàng: tài khoản ở bước 1
   - Gọi đến URL: `https://<địa chỉ tunnel>/api/v1/finance/webhook/sepay`
   - Là webhook xác thực thanh toán: **Có**
   - Kiểu chứng thực: **API Key** → dán đúng `webhook-api-key` ở bước 2
   - Request Content type: `application/json`
4. Mỗi lần chạy lại tunnel thì địa chỉ đổi, phải sửa URL trên SePay.

## Bước 4. Khởi động lại backend và kiểm tra cấu hình

1. Tắt backend rồi chạy lại (`LocalPressApplication`) để đọc file secrets mới.
2. Đăng nhập `ketoan@localpress.vn`, mở **Nhật ký SePay** (`/backoffice/finance/sepay`). Ô cấu hình phải hiện:
   - Webhook: **Đã cấu hình**
   - Đồng bộ qua API SePay: **Bật**
   - Tài khoản nhận: `****` + **4 số cuối đúng** với tài khoản ở bước 1

## Bước 5. Test 10.000 ₫

1. Đăng nhập `reader.an@gmail.com` → nút **Nạp tiền** trên header → chọn hoặc nhập `10000` → **Nạp 10.000 ₫ qua QR SePay**.
2. Kiểm tra trên trang: tên chủ tài khoản và 4 số cuối khớp tài khoản của anh, nội dung chuyển khoản là mã `LP...`.
3. Quét QR bằng app ngân hàng, **giữ nguyên nội dung chuyển khoản**, chuyển.
4. Chờ trang tự cập nhật (đi đường 3B), hoặc bấm **Tôi đã chuyển khoản, kiểm tra lại** (đi đường 3A).
5. Kết quả đúng:
   - Trang chuyển sang "Đã thanh toán".
   - Ví +10.000 ₫.
   - Nhật ký SePay có 1 dòng nguồn **Webhook** hoặc **Đồng bộ API**, có `SePay #id`; mở Payload thấy nguyên văn JSON SePay gửi.
6. Báo em mã đơn; em kiểm tra DB (`transactions`, `wallet_entries`, `sepay_webhook_logs`) và viết lại kết quả vào tài liệu review.

## Nếu không thành công

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| App ngân hàng báo sai tài khoản khi quét | `account-number` / `bank-short-name` sai, chưa khởi động lại backend |
| Tiền đã trừ nhưng SePay không có giao dịch | Tài khoản chưa bật "Đồng bộ giao dịch → Tiền vào", hoặc bị lọc từ khóa |
| SePay có giao dịch, LocalPress không thấy | Chưa có `api-token` (3A) hoặc webhook chưa trỏ đúng URL tunnel (3B) |
| Nhật ký ghi "Sai khóa, từ chối" | `webhook-api-key` trên SePay khác giá trị trong file |
| Nhật ký ghi "Không khớp đơn" | Nội dung chuyển khoản bị sửa, mất mã `LP...`: gửi khiếu nại, kế toán ghi nhận vào ví |
