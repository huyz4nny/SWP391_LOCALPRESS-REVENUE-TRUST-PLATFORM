# Tracking SV4 (Huy) — sắp theo hành trình của tiền

> Sinh bởi `docs/sv4/03_tools/gen_tracking.py`, cùng nội dung với `TRACKING_SV4.xlsx`.
> Thứ tự: khách bắt đầu trả tiền → SePay báo về → kế toán ghi nhận, xử lý ngoại lệ, chứng từ → cuối kỳ đối soát, hoàn tiền, báo cáo.
> Mã UC giữ nguyên UC047 - UC060; số màn hình SRS/SDS đánh lại II.4.1 - II.4.12 theo thứ tự luồng.

- **Iter 1**: 3 màn hình (3 xong). UC: UC047, UC048, UC049, UC050
- **Iter 2**: 4 màn hình (4 xong). UC: UC051, UC057, UC058
- **Iter 3**: 5 màn hình (2 xong). UC: UC052, UC053, UC054, UC055, UC056, UC059, UC060

## 1. Use case theo thứ tự luồng

| Bước | ID | UC | Actor | Iter | Màn hình | Route / API |
|---|---|---|---|---|---|---|
| 1 | UC047 | **Create Payment Order**<br>Module nguồn (SV1 booking, SV3 mua bài / gói) tạo đơn PENDING mã LP..., giữ 15 phút, rồi chuyển khách sang trang thanh toán chung. Mọi đơn mua đều trả bằng Ví LocalPress: ví đủ thì 1 nút trừ ví; ví thiếu thì trang tự tạo QR nạp bù đúng phần còn thiếu (đơn TOPUP gắn mã đơn), tiền nạp về thì hệ thống tự trừ ví trả đơn. Nút Nạp tiền trên header tạo đơn TOPUP tự do. | Reader, Advertiser | Iter 1 | II.4.1, II.4.2 | `/payment/:orderCode, /wallet, /wallet/topup` |
| 2 | UC050 | **Check Payment Status**<br>Trang thanh toán hỏi trạng thái 3 giây/lần; nút "Tôi đã chuyển khoản, kiểm tra lại" hỏi thẳng API SePay cho đơn đó. Không bao giờ cấp quyền dựa vào trình duyệt (Rule 4). | Reader, Advertiser, Payment Gateway | Iter 1 | II.4.1 | `/payment/:orderCode` |
| 3 | UC048 | **Verify SePay Payment**<br>Xác thực webhook bằng API Key (sai khóa trả 401), đọc payload SePay (id, transferAmount, content, referenceCode), tìm mã đơn trong nội dung chuyển khoản, so số tiền với đơn. Mỗi lần nhận ghi 1 dòng nhật ký kèm payload gốc. | Payment Gateway (SePay) | Iter 1 | II.4.3 | `/backoffice/finance/sepay` |
| 4 | UC049 | **Handle Payment Webhook (Idempotent)**<br>Xử lý tiền về không trùng: sepay_id UNIQUE, đơn đã SUCCESS trả ALREADY_PROCESSED. Tiền nạp -> cộng ví, nạp bù thì tự trả đơn gắn kèm (đủ -> SUCCESS + PaymentSuccessEvent; chưa đủ -> giữ trong ví). Chuyển thẳng vào mã đơn (cách cũ): đủ/thừa -> SUCCESS, thiếu hoặc về muộn -> vào ví. Luôn trả {success:true} khi đã xử lý để SePay ngừng gửi lại. Có đồng bộ dự phòng qua API SePay khi không nhận được webhook. | Payment Gateway (SePay) | Iter 1 | II.4.3 | `POST /api/v1/finance/webhook/sepay` |
| 5 | UC051 | **Handle Unrecorded Payment Complaint**<br>Khách đã chuyển tiền mà sau 15 phút chưa được ghi nhận thì gửi khiếu nại (mã GD ngân hàng UNIQUE). Kế toán đối chiếu sao kê rồi Ghi nhận vào đơn (chạy lại đúng luồng webhook), Cộng vào ví, hoặc Từ chối có lý do. Thay cho duyệt chuyển khoản thủ công. | Reader, Advertiser, Accountant | Iter 2 | II.4.4, II.4.5 | `/wallet/complaints, /backoffice/finance/complaints` |
| 6 | UC057 | **Generate Financial Documents**<br>Kế toán tra danh sách đơn, xem chi tiết các lần thanh toán và in hóa đơn điện tử / chứng từ cho đơn đã thanh toán. | Accountant | Iter 2 | II.4.6 | `/backoffice/finance/orders, /backoffice/finance/orders/:id` |
| 7 | UC058 | **View Financial Ledger**<br>Sổ quỹ: bút toán thu (Có) và hoàn (Nợ), số dư ròng tính từ các dòng. Tiền nạp ví là công nợ phải trả khách, không tính doanh thu (Rule 16). | Accountant | Iter 2 | II.4.7 | `/backoffice/finance/ledger` |
| 8 | UC052 | **View Cash Flow Dashboard**<br>Doanh thu thực thu, biểu đồ theo ngày, việc cần xử lý (hoàn tiền chờ duyệt, đơn chờ, chênh lệch đối soát, khiếu nại). | Accountant, Chief Accountant | Iter 3 | II.4.8 | `/backoffice/finance` |
| 9 | UC053 | **Manage Advertiser Receivables**<br>Công nợ quảng cáo theo chiến dịch: PAID_IN_FULL / IN_TERM / OVERDUE, số ngày quá hạn, nhắc nợ. | Accountant, Advertiser | Iter 3 | II.4.9 | `(API GET /finance/receivables, chưa có màn hình)` |
| 10 | UC054 | **Reconcile Payment Mismatch**<br>Đối soát kỳ: tổng hệ thống vs sao kê, xử lý từng khoản lệch có ghi chú, kế toán trưởng chốt kỳ. | Accountant, Chief Accountant, Bank Statement | Iter 3 | II.4.10 | `/backoffice/finance/reconciliation` |
| 11 | UC055 | **Process Refund Request (Four-Eyes)**<br>Mắt 1 kế toán viên lập đề xuất (tối đa số đã thu, tính cả đề xuất đang chờ - Rule 11), mắt 2 kế toán trưởng duyệt; người lập không tự duyệt. | Accountant, Chief Accountant | Iter 3 | II.4.11 | `/backoffice/finance/refunds` |
| 12 | UC056 | **Adjust Reading or Campaign Rights**<br>Hoàn tất hoàn tiền -> ghi giao dịch REFUND (đơn trả bằng ví thì hoàn vào ví) và phát RefundCompletedEvent; SV1/SV3 tự thu hồi quyền khi hoàn toàn bộ (Rule 17). | System, SV1 / SV3 Modules | Iter 3 | II.4.11 | `(sự kiện RefundCompletedEvent)` |
| 13 | UC059 | **Export Financial Report**<br>Xuất CSV giao dịch (UTF-8 có BOM cho Excel) theo khoảng ngày. | Chief Accountant | Iter 3 | II.4.12 | `(API GET /finance/reports/export, chưa có màn hình)` |
| 14 | UC060 | **View Financial Alerts**<br>Cảnh báo: hoàn tiền chờ duyệt, khiếu nại mở, công nợ quá hạn, webhook lỗi. | Accountant | Iter 3 | II.4.12 | `(API GET /finance/alerts, chưa có màn hình)` |

## 2. Màn hình / chức năng

| SRS | Màn hình | Iter | UC | Status | Route | Bảng (CRUD) | Ghi chú |
|---|---|---|---|---|---|---|---|
| II.4.1 | Payment Checkout | Iter 1 | UC047, UC050 | Done | `/payment/:orderCode` | transactions CRU, wallets RU, wallet_entries C | [Đầu quy trình] Trang thanh toán chung, mọi đơn trả bằng ví: ví đủ -> 1 nút trừ ví (khóa dòng đơn + ví, 402 thiếu tiền, 410 hết hạn); ví thiếu -> QR nạp bù đúng phần thiếu (shortfall-topup, dùng lại mã còn hạn), tiền về tự trả đơn. Polling 3 giây, kiểm tra lại qua API SePay. Không phải chủ đơn -> 403. |
| II.4.2 | LocalPress Wallet and Top-up | Iter 1 | UC047, UC050 | Done | `/wallet, /wallet/topup` | transactions C, wallets R, wallet_entries R | [Đầu quy trình] Số dư + lịch sử ví; nạp tiền 10.000 - 50.000.000 ₫ (bội số 1.000) tạo đơn TOPUP rồi sang trang thanh toán chung. Tiền nạp là công nợ phải trả khách, không phải doanh thu. |
| II.4.3 | SePay Webhook and Payment Log | Iter 1 | UC048, UC049 | Done | `/backoffice/finance/sepay` | transactions RU, wallets U, wallet_entries C, sepay_webhook_logs CR | [Đầu quy trình] Webhook SePay (API Key, idempotent theo sepay_id) + nhật ký từng lần tiền về kèm payload gốc; đồng bộ dự phòng qua API SePay. Kế toán xem nguồn Webhook / Đồng bộ API / Giả lập. Cần tunnel để SePay gọi vào máy local. |
| II.4.4 | Payment Complaint (Customer) | Iter 2 | UC051 | Done | `/wallet/complaints` | transactions R, payment_complaints CR | [Giữa quy trình] Khách gửi khiếu nại đã chuyển tiền chưa được ghi nhận: số tiền, thời gian, mã GD ngân hàng (UNIQUE, 409 nếu trùng), mã đơn (404 nếu không có, 403 nếu của người khác); theo dõi phản hồi của kế toán. |
| II.4.5 | Payment Complaint Queue | Iter 2 | UC051 | Done | `/backoffice/finance/complaints` | transactions RU, wallets U, wallet_entries C, payment_complaints RU | [Giữa quy trình] Kế toán đối chiếu sao kê: Ghi nhận vào đơn (chạy lại hàm webhook), Cộng vào ví (TOPUP CMP-...), Từ chối bắt buộc lý do. Khóa dòng khiếu nại, xử lý lại -> 409. Không có nút đánh dấu PAID. |
| II.4.6 | Payment Orders and Financial Documents | Iter 2 | UC057 | Done | `/backoffice/finance/orders, /backoffice/finance/orders/:id` | users R, transactions R | [Giữa quy trình] Danh sách đơn (lọc loại, trạng thái, tìm kiếm), chi tiết các lần thanh toán, hóa đơn điện tử in / lưu PDF cho đơn đã thanh toán, nút lập đề xuất hoàn tiền. |
| II.4.7 | Financial Ledger | Iter 2 | UC058 | Done | `/backoffice/finance/ledger` | transactions R | [Giữa quy trình] Sổ quỹ: thu (Có), hoàn (Nợ), số dư ròng; loại TOPUP khỏi doanh thu (Rule 16). |
| II.4.8 | Cash Flow Dashboard | Iter 3 | UC052 | Done | `/backoffice/finance` | transactions R, refund_requests R | [Cuối quy trình] Doanh thu thực thu, biểu đồ 14 ngày, hàng việc cần xử lý. |
| II.4.9 | Advertiser Receivables | Iter 3 | UC053 | In Progress | `(chưa có)` | advertisers R, ad_campaigns R, transactions R | [Cuối quy trình] Công nợ quảng cáo theo chiến dịch. Đã có API GET /finance/receivables, chưa có màn hình, chưa có nhắc nợ. |
| II.4.10 | Payment Reconciliation | Iter 3 | UC054 | In Progress | `/backoffice/finance/reconciliation` | transactions RU | [Cuối quy trình] Đối soát kỳ, xử lý khoản lệch, chốt kỳ. Sao kê đang giả lập bằng tổng hệ thống, khoản lệch lưu trong bộ nhớ. |
| II.4.11 | Refund and Rights Management | Iter 3 | UC055, UC056 | Done | `/backoffice/finance/refunds` | transactions CRU, refund_requests CRU, wallets U, wallet_entries C | [Cuối quy trình] Hoàn tiền 4 mắt, Refund Cap, giao dịch REFUND, hoàn vào ví cho đơn trả bằng ví, phát RefundCompletedEvent. Listener thu hồi quyền của SV1 / SV3 chưa có. |
| II.4.12 | Financial Reports and Alerts | Iter 3 | UC059, UC060 | In Progress | `(chưa có)` | transactions R, refund_requests R, payment_complaints R, sepay_webhook_logs R | [Cuối quy trình] Xuất CSV, cảnh báo. Đã có API, chưa có màn hình, CSV chưa lọc theo ngày. |

## 3. Luồng nghiệp vụ đầu → cuối

| Bước | Ai làm | Việc | Màn hình | UC | Iter | Swimlane |
|---|---|---|---|---|---|---|
| 1 | Độc giả / Doanh nghiệp | Bấm Mua bài, Mua gói, Thanh toán booking (màn hình của SV3 / SV1); module nguồn tạo bản ghi chờ rồi gọi POST /finance/orders | SV3 / SV1 -> II.4.1 | UC047 | Iter 1 | 01 |
| 2 | Hệ thống | Tạo đơn PENDING mã LP..., hết hạn 15 phút, chuyển khách sang /payment/:orderCode | II.4.1 | UC047 | Iter 1 | 01 |
| 3 | Hệ thống | Kiểm tra ví: đủ tiền thì hiện 1 nút Thanh toán bằng ví (trừ ví, SUCCESS, PaymentSuccessEvent) | II.4.1 | UC047 | Iter 1 | 01 |
| 4 | Khách | Ví thiếu: trang tự tạo QR nạp bù đúng phần thiếu (đơn TOPUP gắn mã đơn); khách quét QR chuyển khoản. Nạp tự do: nút Nạp tiền trên header | II.4.1, II.4.2 | UC047 | Iter 1 | 01, 02 |
| 5 | SePay -> Hệ thống | Ngân hàng báo có, SePay gọi webhook: xác thực API Key, ghi nhật ký, cộng ví, nạp bù thì tự trừ ví trả đơn; gửi lại không xử lý trùng | II.4.3 | UC048, UC049 | Iter 1 | 01 |
| 6 | Trang thanh toán | Hỏi trạng thái 3 giây/lần; nút Kiểm tra lại hỏi thẳng API SePay; đơn SUCCESS -> module nguồn mở quyền qua PaymentSuccessEvent | II.4.1 | UC050 | Iter 1 | 01 |
| 7 | Khách | Đã chuyển hơn 15 phút chưa được ghi nhận: gửi khiếu nại kèm mã GD ngân hàng | II.4.4 | UC051 | Iter 2 | 03 |
| 8 | Kế toán | Đối chiếu sao kê: ghi nhận vào đơn, cộng vào ví, hoặc từ chối có lý do | II.4.5 | UC051 | Iter 2 | 03 |
| 9 | Kế toán | Tra đơn, xem các lần thanh toán, in hóa đơn điện tử | II.4.6 | UC057 | Iter 2 | 06 |
| 10 | Kế toán | Xem sổ quỹ thu / hoàn, số dư ròng | II.4.7 | UC058 | Iter 2 | 06 |
| 11 | Kế toán / Kế toán trưởng | Theo dõi dòng tiền và việc cần xử lý trên dashboard | II.4.8 | UC052 | Iter 3 | 06 |
| 12 | Kế toán | Theo dõi công nợ quảng cáo, nhắc nợ | II.4.9 | UC053 | Iter 3 | 04 |
| 13 | Kế toán -> Kế toán trưởng | Đối soát kỳ với sao kê, xử lý khoản lệch, chốt kỳ | II.4.10 | UC054 | Iter 3 | 04 |
| 14 | Kế toán -> Kế toán trưởng | Hoàn tiền 4 mắt; hoàn tất thì SV1/SV3 thu hồi quyền qua RefundCompletedEvent | II.4.11 | UC055, UC056 | Iter 3 | 05 |
| 15 | Kế toán trưởng | Xuất báo cáo, xem cảnh báo | II.4.12 | UC059, UC060 | Iter 3 | 06 |

## 4. So với tracking cũ (project_tracking_group2.xlsx)

| Cũ | Mới | Lý do |
|---|---|---|
| Iter 1: Financial Documents and Ledger (II.4.1) | Iter 2: II.4.6, II.4.7 | Chứng từ và sổ quỹ chỉ có dữ liệu sau khi tiền đã về, nên ở giữa luồng |
| Iter 1: Manual Bank Transfer Confirmation (II.4.2, UC051) | Iter 2: II.4.4 + II.4.5 Payment Complaint | Đã bỏ duyệt chuyển khoản thủ công; UC051 thành khiếu nại có đối chiếu sao kê |
| Iter 2: Payment Processing (II.4.3) | Iter 1: II.4.1 Payment Checkout + II.4.3 SePay Webhook and Payment Log | Thanh toán là điểm bắt đầu của luồng tiền |
| (không có) | Iter 1: II.4.2 LocalPress Wallet and Top-up | Ví thêm ở V3; từ 22/10/2026 mọi đơn trả qua ví, thiếu thì nạp bù (V6 `topup_for_order`) |
| Iter 2: Advertiser Receivables (II.4.4) | Iter 3: II.4.9 | Công nợ là việc cuối kỳ, chưa có màn hình |
| Iter 3: 4 màn hình | Iter 3: 5 màn hình (II.4.8 - II.4.12) | Giữ nguyên nội dung, đánh lại số |

Cần cập nhật theo: số mục SRS/SDS của SV4 trong `Template1_SRS_Gr2.docx` và dòng SV4 trong `project_tracking_group2.xlsx` (nếu nhóm đồng ý dùng bản này).
