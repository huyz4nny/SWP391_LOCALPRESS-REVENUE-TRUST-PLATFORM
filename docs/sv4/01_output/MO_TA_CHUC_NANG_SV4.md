# MÔ TẢ CHỨC NĂNG SV4 — Thanh toán, Ví, Kế toán & Đối soát (Iter 1 → Iter 3)

> Bản để Leader duyệt (22/10/2026). Sắp theo hành trình của tiền: khách trả tiền → SePay báo về → kế toán ghi nhận, xử lý ngoại lệ, chứng từ → cuối kỳ đối soát, hoàn tiền, báo cáo.
> Mỗi chức năng ghi nhãn Iter ở tiêu đề. Phần dùng chung cho cả 3 Iter chỉ ghi 1 lần ở mục 0.
> Trạng thái: **Xong** = có code, đã test; **Đang làm** = có một phần; **Chưa làm** = chưa có code.

---

## 0. Dùng chung `[Iter 1 · 2 · 3]`

### 0.1 Nguyên tắc tiền
- **Mọi đơn mua (bài Premium, gói hội viên, booking quảng cáo) đều trả bằng Ví LocalPress.** Không còn trả QR thẳng vào đơn.
- **Tiền chỉ vào ví qua SePay**: webhook hoặc đồng bộ API SePay. Trình duyệt không bao giờ tự cộng tiền hay cấp quyền (Rule 4).
- **Không xử lý trùng**: mỗi giao dịch SePay có `sepay_id` UNIQUE; mỗi bút toán ví UNIQUE(`transaction_id`, `direction`) (Rule 5).
- **Tiền nạp ví là công nợ phải trả khách, không phải doanh thu.** Doanh thu ghi nhận khi khách tiêu ví cho đơn (Rule 16).
- **Tiền khách không bao giờ bị treo**: chuyển thiếu, chuyển thừa, về muộn, đơn hết hạn thì tiền vẫn nằm trong ví.

### 0.2 Hợp đồng với module khác (Rule 17)
- SV1 / SV3 tạo bản ghi chờ (purchase / subscription / campaign) → `POST /api/v1/finance/orders` → chuyển khách sang `/payment/:orderCode`.
- SV4 phát `PaymentSuccessEvent` khi đơn được trả, `RefundCompletedEvent` khi hoàn tiền xong. SV1 / SV3 tự lắng nghe để mở / thu hồi quyền.
- SV4 không sửa bảng của module khác.

### 0.3 Giao diện & phân quyền
- **Khung Backoffice**: sidebar nhóm "Tài chính & đối soát", chỉ hiện với vai trò tài chính. API kiểm tra lại vai trò ở `SecurityConfig` và controller.
- **Nút ví trên header** (mọi layout): số dư + "Nạp tiền", tự cập nhật khi ví đổi.
- **Giao diện sáng / tối** cho toàn site, lưu lựa chọn.
- **Chống xem trộm (Rule 14)**: khách chỉ xem đơn, ví, khiếu nại của mình; đoán mã đơn người khác nhận 403.
- **Định dạng**: tiền VND, giờ Việt Nam, số canh phải.

---

## ITERATION 1 — ĐẦU LUỒNG: KHÁCH TRẢ TIỀN, SEPAY BÁO VỀ

### `[Iter 1]` F1. Trang thanh toán chung — II.4.1 (UC047, UC050) — **Xong**
**Ai dùng**: độc giả, doanh nghiệp. **Vào từ**: nút Mua / Thanh toán của SV1, SV3 → `/payment/:orderCode`.

1. Hiện đơn: loại, nội dung, số tiền, trạng thái, thời gian giữ đơn (15 phút).
2. **Ví đủ tiền** → chỉ một nút "Thanh toán X bằng ví". Bấm là trừ ví, đơn SUCCESS, phát `PaymentSuccessEvent`.
3. **Ví 0 ₫ hoặc thiếu**:
   - Trang tự tạo **mã QR nạp bù đúng phần còn thiếu** (ví dụ ví 9.000 ₫, đơn 15.000 ₫ → QR 6.000 ₫). Nội dung chuyển khoản là mã nạp `LP...`.
   - Khi SePay báo tiền nạp về, hệ thống **tự trừ ví trả đơn**, khách không bấm thêm.
   - Nạp chưa đủ: tiền vẫn vào ví, trang tạo QR mới cho phần còn lại.
   - Mở lại trang thì dùng lại mã nạp bù còn hạn, không sinh QR mới mỗi lần.
4. Trang hỏi trạng thái 3 giây/lần. Nút "Tôi đã chuyển khoản, kiểm tra lại" hỏi thẳng API SePay (cần token).
5. Đơn hết hạn: báo hết hạn; tiền đã nạp vẫn ở trong ví, khách tạo đơn mới để trả.
6. Link gửi khiếu nại khi đã chuyển mà chưa được ghi nhận.

**Luật**:
- Bấm 2 lần chỉ trừ 1 lần (khóa dòng đơn + dòng ví).
- Thiếu tiền → 402; đơn hết hạn → 410; đơn của người khác → 403.

**Bảng**: `transactions` (đơn; đơn nạp bù có `topup_for_order`), `wallets`, `wallet_entries`.

### `[Iter 1]` F2. Ví LocalPress & Nạp tiền — II.4.2 (UC047 loại TOPUP, UC050) — **Xong**
**Ai dùng**: độc giả, doanh nghiệp. **Vào từ**: nút "Nạp tiền" trên header, `/wallet`, `/wallet/topup`.

1. **Ví**: số dư lớn, bảng biến động (thời gian, nội dung, +/− số tiền, số dư sau), tổng đã nạp / đã chi.
2. **Nạp tiền tự do**:
   - Chọn nhanh 50k / 100k / 200k / 500k / 1tr, hoặc tự nhập 10.000 - 50.000.000 ₫, bội số 1.000.
   - Báo lỗi tiếng Việt khi nhập sai.
   - Tạo đơn TOPUP rồi mở trang QR.
3. SePay báo về → cộng **đúng số tiền thực nhận** (kể cả sau hạn QR).
4. Tiền nạp không rút ra ngân hàng.

**Luật**: số dư không bao giờ âm (CHECK ở DB). Nạp ngoài hạn mức → 400.

**Bảng**: `transactions` (TOPUP), `wallets`, `wallet_entries`.

### `[Iter 1]` F3. Webhook SePay, đồng bộ API & Nhật ký SePay — II.4.3 (UC048, UC049) — **Xong** (chờ test tiền thật)
**Ai dùng**: SePay (gọi vào), kế toán (xem nhật ký). **Vào từ**: `POST /api/v1/finance/webhook/sepay`, `/backoffice/finance/sepay`.

1. **Nhận webhook đúng định dạng SePay** (`id`, `transferAmount`, `content`, `referenceCode`...), xác thực `Authorization: Apikey`. Sai khóa → 401.
2. **Tìm mã đơn `LP...`** trong nội dung chuyển khoản (ngân hàng có thêm chữ vẫn tìm được).
3. **Kết quả xử lý**:
   - Tiền nạp → cộng ví, nạp bù thì tự trả đơn.
   - Chuyển thẳng vào mã đơn (cách cũ / khiếu nại) → vẫn xử lý: đủ / thừa / thiếu / về muộn, phần không dùng vào ví.
   - Không có mã đơn → giữ chờ kế toán.
   - Tiền ra → bỏ qua.
4. **Luôn trả `200 {"success": true}`** khi đã xử lý, để SePay không gửi lại 7 lần. Lỗi bất ngờ → 500 để SePay gửi lại.
5. **Đồng bộ dự phòng qua API SePay** (cần token): nút "Đồng bộ từ SePay" (24 giờ) và nút kiểm tra lại của khách.
6. **Màn Nhật ký SePay**:
   - Mỗi lần nhận 1 dòng: nguồn (Webhook / Đồng bộ API / Giả lập), id SePay, nội dung, mã đơn, kết quả, số tiền, payload gốc.
   - Lọc theo nguồn.
   - Ô cấu hình: webhook, token, 4 số cuối tài khoản.
7. **Nút giả lập** (chỉ môi trường dev) đi qua đúng đường xử lý thật, ghi nhãn "Giả lập", không tính vào tiền thật.

**Luật**: `sepay_id` UNIQUE, 2 lần gửi đồng thời chỉ 1 lần được ghi nhận. Khách xem nhật ký → 403.

**Bảng**: `sepay_webhook_logs`, `transactions`, `wallets`, `wallet_entries`.

---

## ITERATION 2 — GIỮA LUỒNG: KẾ TOÁN GHI NHẬN, XỬ LÝ NGOẠI LỆ, CHỨNG TỪ

### `[Iter 2]` F4. Khiếu nại thanh toán (phía khách) — II.4.4 (UC051) — **Xong**
**Ai dùng**: độc giả, doanh nghiệp. **Vào từ**: link trên trang thanh toán / ví → `/wallet/complaints`.

1. Form: số tiền đã chuyển, thời gian, mã giao dịch ngân hàng, mã đơn (không bắt buộc), ghi chú. Mở từ trang thanh toán thì điền sẵn.
2. Danh sách "Khiếu nại của tôi": trạng thái Chờ đối soát / Đã ghi nhận / Từ chối, kèm phản hồi của kế toán.

**Luật**:
- 1 mã giao dịch ngân hàng chỉ khiếu nại 1 lần (409).
- Mã đơn không tồn tại → 404; đơn của người khác → 403.
- Thời gian không được ở tương lai.

**Bảng**: `payment_complaints`.

### `[Iter 2]` F5. Hàng chờ khiếu nại (phía kế toán) — II.4.5 (UC051) — **Xong**
**Ai dùng**: kế toán. **Vào từ**: `/backoffice/finance/complaints`.

1. Lọc Chờ đối soát / Đã ghi nhận / Từ chối / Tất cả. Cũ nhất lên trước để xử lý theo thứ tự.
2. Đối chiếu sao kê, chọn 1 trong 3 cách xử lý:
   - **Ghi nhận vào đơn**: chạy lại đúng hàm xử lý webhook, nên webhook thật về sau không cộng trùng.
   - **Cộng vào ví**: tạo khoản nạp `CMP-<mã GD>`, chỉ 1 lần.
   - **Từ chối**: bắt buộc lý do, khách nhìn thấy.
3. Hỏi xác nhận "Đã khớp sao kê" trước khi ghi nhận.

**Luật**:
- Không có nút "đánh dấu PAID" thủ công.
- 2 kế toán bấm cùng lúc → người sau nhận 409.
- Đơn còn chờ và còn hạn mà chọn "Cộng vào ví" → 409.

**Bảng**: `payment_complaints`, `transactions`, `wallets`, `wallet_entries`.

### `[Iter 2]` F6. Đơn thanh toán & Chứng từ — II.4.6 (UC057) — **Xong**
**Ai dùng**: kế toán. **Vào từ**: `/backoffice/finance/orders`, `/orders/:id`.

1. **Danh sách đơn** (100 đơn mới nhất):
   - Lọc loại (Gói / Bài lẻ / Quảng cáo / Nạp ví) kèm số đếm.
   - Lọc trạng thái, tìm theo mã đơn / khách / dịch vụ, tổng tiền theo bộ lọc.
2. **Chi tiết đơn**: thông tin thanh toán, các lần thanh toán, nút lập đề xuất hoàn tiền (sang F11).
3. **Hóa đơn điện tử** (chứng từ mô phỏng): đơn vị bán, khách, mã đơn, dịch vụ, thuế GTGT 10% đã gồm trong giá; in hoặc lưu PDF.

**Luật**: chỉ đơn đã thanh toán mới in được chứng từ.

**Bảng**: `transactions`.

### `[Iter 2]` F7. Sổ quỹ — II.4.7 (UC058) — **Xong**
**Ai dùng**: kế toán. **Vào từ**: `/backoffice/finance/ledger`.

1. Số dư ròng, tổng thu (Có), tổng hoàn (Nợ), đều tính từ chính các dòng trên bảng.
2. Bảng bút toán: mã, thời gian, diễn giải, người ghi, Thu / Hoàn; dòng "Cộng phát sinh".

**Luật**: không tính tiền nạp ví (Rule 16); chỉ tính giao dịch đã thành công / đã hoàn.

**Bảng**: `transactions`.

---

## ITERATION 3 — CUỐI LUỒNG: DÒNG TIỀN, ĐỐI SOÁT, HOÀN TIỀN, BÁO CÁO

### `[Iter 3]` F8. Tổng quan dòng tiền — II.4.8 (UC052) — **Xong**
**Ai dùng**: kế toán, kế toán trưởng. **Vào từ**: `/backoffice/finance`.

1. Doanh thu thực thu và số đơn đã thanh toán.
2. Biểu đồ doanh thu 14 ngày, tính từ chính các đơn.
3. "Việc cần xử lý": hoàn tiền chờ duyệt, đơn chờ thanh toán, chênh lệch đối soát, khiếu nại.
4. 6 giao dịch gần đây; nút làm mới kèm giờ cập nhật.

### `[Iter 3]` F9. Công nợ doanh nghiệp — II.4.9 (UC053) — **Đang làm**
1. Đã có: API `GET /finance/receivables` chia nhóm Đã trả đủ / Trong hạn / Quá hạn, kèm số ngày quá hạn.
2. Chưa có: màn hình, nhắc nợ.
3. Cần anh quyết: khi mọi đơn đã trả trước bằng ví thì công nợ còn ý nghĩa không? Chỉ còn ý nghĩa nếu cho doanh nghiệp đặt quảng cáo trả sau.

### `[Iter 3]` F10. Đối soát kỳ — II.4.10 (UC054) — **Đang làm**
1. Đã có:
   - Màn hình so tổng hệ thống với sao kê, danh sách khoản lệch, xử lý từng khoản (bắt buộc ghi chú).
   - Kế toán trưởng chốt kỳ.
2. Chưa thật: sao kê đang giả lập, khoản lệch lưu trong bộ nhớ (khởi động lại là mất).
3. Hướng làm: dùng chính `sepay_webhook_logs` / API SePay làm "sao kê" để so với giao dịch ví.

### `[Iter 3]` F11. Hoàn tiền 4 mắt & điều chỉnh quyền — II.4.11 (UC055, UC056) — **Xong** (thiếu listener SV1/SV3)
**Ai dùng**: kế toán viên (mắt 1), kế toán trưởng (mắt 2). **Vào từ**: `/backoffice/finance/refunds`, nút trên chi tiết đơn.

1. Mắt 1 lập đề xuất: chọn đơn đã thanh toán, số tiền (hoàn một phần được), quyền lợi bị thu hồi, lý do.
2. Mắt 2 duyệt hoặc từ chối, kèm ý kiến.
3. **Duyệt**:
   - Ghi giao dịch REFUND, **hoàn tiền vào ví khách** (mọi đơn giờ đều trả bằng ví).
   - Hoàn toàn bộ thì đơn gốc chuyển REFUNDED.
   - Phát `RefundCompletedEvent`. Hoàn toàn bộ thì thu hồi quyền, hoàn một phần thì khách giữ quyền.

**Luật**:
- Người lập không tự duyệt (403).
- Tổng hoàn không vượt số đã thu, tính cả đề xuất đang chờ (Rule 11).
- Không hoàn đơn nạp ví.

**Chưa có**: listener thu hồi quyền ở SV1 / SV3; vai trò "Kế toán trưởng" chưa có trong bảng `users` (API thật đang dùng SYSTEM_ADMIN).

### `[Iter 3]` F12. Báo cáo & cảnh báo — II.4.12 (UC059, UC060) — **Đang làm**
1. Đã có:
   - API xuất CSV giao dịch (mở được bằng Excel).
   - API cảnh báo: hoàn tiền chờ duyệt, khiếu nại mở, công nợ quá hạn.
2. Chưa có: màn hình, lọc CSV theo khoảng ngày, cảnh báo webhook lỗi (lấy từ `sepay_webhook_logs`).

---

## Điểm cần anh duyệt

| # | Nội dung | Đề xuất hiện tại |
|---|---|---|
| 1 | Mọi đơn mua trả bằng ví, thiếu thì QR nạp bù, tiền về tự trả đơn | Đã làm, 26/26 test đầu cuối pass với backend thật |
| 2 | Mã nạp bù đúng bằng phần thiếu, không bắt tối thiểu 10.000 ₫ | Đã làm. Nạp tự do vẫn tối thiểu 10.000 ₫ |
| 3 | Tiền chuyển thẳng vào mã đơn (cách cũ) vẫn được nhận | Giữ để khiếu nại "Ghi nhận vào đơn" và khách chuyển nhầm mã vẫn chạy |
| 4 | Đơn hết hạn khi tiền nạp bù mới về | Tiền giữ trong ví, khách tạo đơn mới. Riêng booking quảng cáo không tự kích hoạt lại slot (Rule 6 phần "còn chỗ thì kích hoạt" chưa làm) |
| 5 | Công nợ doanh nghiệp (F9) | Cần anh quyết có giữ ở Iter 3 không |
| 6 | Đối soát dùng nhật ký SePay làm sao kê (F10) | Đề xuất cho Iter 3 |
| 7 | Sau khi duyệt bản này | Em cập nhật theo: AGENTS.md mục 5 (trang thanh toán không còn 2 phương thức), TRACKING_SV4, REVIEW_ITER_1_2 mục II.4.1, swimlane 01 - 02 |
