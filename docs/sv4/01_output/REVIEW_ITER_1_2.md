# REVIEW ITERATION 1 & 2 — SV4 (Huy): Thanh toán, Ví, SePay, Khiếu nại, Chứng từ, Sổ quỹ

> Cách chấm: **mỗi màn hình 1 điểm**. Thầy hỏi mọi thứ trên màn hình (nav, nút, ô nhập): "bấm cái này thì code chạy thế nào".
> Điểm cao hơn khi **sửa sâu tại chỗ** (DB, backend, không chỉ đổi chữ trên giao diện).
> Tài liệu này đi theo đúng thứ tự luồng tiền. Mỗi màn hình có: mở ở đâu, câu hỏi màn hình trả lời, bảng "nút → code → DB",
> kịch bản bấm, câu thầy hay hỏi, và 2-3 bài sửa tại chỗ đã chuẩn bị sẵn (đúng file, đúng dòng).
>
> Bảng theo dõi: [`TRACKING_SV4.xlsx`](TRACKING_SV4.xlsx) / [`TRACKING_SV4.md`](TRACKING_SV4.md).
> Ảnh từng bước: [`screenshots/README.md`](screenshots/README.md) (giao diện tối: `screenshots_dark/`).
> Swimlane: [`SWIMLANE_SV4.md`](SWIMLANE_SV4.md). Số dòng code ghi theo bản ngày 21/10/2026; sửa code xong nên kiểm lại bằng tìm kiếm tên hàm.

**Viết tắt đường dẫn**

| Viết tắt | Đường dẫn |
|---|---|
| FE | `frontend/src/features/finance/` |
| BE | `backend/src/main/java/com/localpress/finance/` |
| SQL | `backend/src/main/resources/db/migration/` |
| SC | `backend/src/main/java/com/localpress/shared/security/SecurityConfig.java` |

| Iter | Màn hình | UC |
|---|---|---|
| **1** — đầu luồng (tiền vào) | II.4.1 Trang thanh toán chung (mọi đơn trả qua ví) · II.4.2 Ví & nạp tiền · II.4.3 Webhook & Nhật ký SePay | UC047, UC050, UC048, UC049 |
| **2** — giữa luồng (kế toán ghi nhận) | II.4.4 Khiếu nại (khách) · II.4.5 Hàng chờ khiếu nại · II.4.6 Đơn & chứng từ · II.4.7 Sổ quỹ | UC051, UC057, UC058 |

---

## 0. Chuẩn bị trước buổi review (15 phút)

| Việc | Lệnh / thao tác |
|---|---|
| Bật MySQL (cần quyền admin) | Mở terminal **Run as administrator**: `net start MySQL80` |
| Chạy backend thật (profile dev, có nút giả lập) | Chạy `LocalPressApplication` trong IntelliJ, hoặc `cd backend` rồi `mvn spring-boot:run` nếu máy có Maven trong PATH (Flyway tự chạy V1 → V5) |
| Chạy frontend gọi API thật | `.env`: `VITE_USE_MOCK_API=false`, rồi `npm --prefix frontend run dev` |
| Không có DB thì chạy mock | launch config `frontend-mock-data` (dữ liệu trong trình duyệt, đủ để demo giao diện + luồng) |
| Tài khoản (API thật, mật khẩu `password`) | Khách: `reader.an@gmail.com` · Kế toán: `ketoan@localpress.vn` · Admin (chốt kỳ, duyệt 4 mắt): `admin@localpress.vn` |
| Tài khoản (mock) | Bộ chuyển vai trò góc phải dưới: Nguyễn Văn An (khách), Lê Thị Thu Ngân (kế toán viên), Phạm Trưởng Phòng (kế toán trưởng) |
| Chạy thử webhook đầu cuối (2 phút trước giờ review) | `python backend/scripts/sepay_webhook_e2e.py` → phải ra `18/18 PASS` (đã chạy 22/10/2026 với backend thật + MySQL: 18/18) |
| SePay thật (tùy chọn) | Tiền thật về máy local: `powershell -ExecutionPolicy Bypass -File backend/scripts/sepay-tunnel.ps1`, dán URL vào my.sepay.vn > Webhooks. Không có tunnel thì đặt `api-token` trong `backend/config/application-secrets.yml` để nút "Đồng bộ từ SePay" kéo giao dịch thật |
| Mở sẵn tab | `/payment/<mã đơn mới>`, `/wallet`, `/backoffice/finance/sepay`, `/backoffice/finance/complaints`, `/backoffice/finance/orders`, `/backoffice/finance/ledger`, MySQL Workbench |
| Mở sẵn file trong IDE | `PaymentPage.tsx`, `payment.ts`, `PaymentProcessingController.java`, `PaymentProcessingService.java`, `SepayGatewayService.java`, `V3__wallet_and_topup.sql`, `V5__sepay_webhook_logs.sql` |

---

## 1. Cách trình bày 1 màn hình (3 lớp)

1. **Khung**: layout nào bọc màn hình, ai được vào (route guard FE + rule SC + kiểm tra lại ở controller).
2. **Nội dung**: màn hình trả lời câu hỏi gì, khối lớn nhất là gì, dữ liệu lấy từ API nào.
3. **Từng nút**: bấm → hàm FE → API → controller → service (luật nghiệp vụ, mã lỗi) → bảng DB → kết quả hiện lại.

Câu mở đầu nên nói: *"Mọi đơn đều trả bằng ví; ví chỉ có tiền khi SePay xác nhận ở server. Trình duyệt không bao giờ tự cấp quyền (Rule 4). Mọi lần tiền về đều có 1 dòng nhật ký, xử lý không trùng (Rule 5)."*

### Khung chung (dùng cho mọi màn hình kế toán)

| Phần tử | Code | Ghi chú khi bị hỏi |
|---|---|---|
| Sidebar nhóm "Tài chính & đối soát" | `frontend/src/layouts/BackofficeLayout.tsx:111` (`financeItems`) | Chỉ hiện khi `PERMISSION_CHECKERS.canAccessFinance(role)`; route bọc `ProtectedRoute allowedRoles={FINANCE_ROLES}` trong `app/router.tsx` |
| Mục đang sáng | `BackofficeLayout.tsx:138` (`activePath`) | Khớp đường dẫn dài nhất, nên `/orders/12` vẫn sáng "Đơn thanh toán" |
| Nút Giao diện tối/sáng | `components/shared/ThemeToggle.tsx`, script đầu `frontend/index.html` | Gắn class `dark` trên `<html>`, lưu `localStorage['localpress-theme']`. Màu lấy từ biến CSS trong `styles/globals.css` (sinh bởi `frontend/scripts/gen_theme_css.py`) |
| Header khách: số dư + Nạp tiền | `components/shared/WalletBalanceButton.tsx` | Gọi `GET /finance/wallet/me`; nghe sự kiện `localpress-wallet-changed` để tự cập nhật |
| Phân quyền API | SC dòng 62 (webhook `permitAll`), 72-77 (đơn, ví, khiếu nại: đã đăng nhập), 78 (mọi `/finance/**` khác: `ACCOUNTANT`, `STAFF`, `SYSTEM_ADMIN`) | Controller kiểm tra lại: `FinanceCurrentUser.require()` (`BE/service/FinanceCurrentUser.java:45`), `assertCanAccess` (:38) trả 403 nếu không phải chủ đơn |

---

# ITERATION 1 — ĐẦU LUỒNG: KHÁCH TRẢ TIỀN, SEPAY BÁO VỀ

## II.4.1 Trang thanh toán chung — `/payment/:orderCode` (UC047, UC050)

**Ai mở**: khách đã đăng nhập, sau khi module SV1/SV3 tạo đơn (`POST /api/v1/finance/orders`, `PaymentProcessingController.java:55` → `PaymentProcessingService.createOrder` :67).
**Câu hỏi màn hình trả lời**: "Đơn này bao nhiêu tiền, ví tôi có đủ không, đã được ghi nhận chưa?"
**Nguyên tắc (từ 22/10/2026)**: **mọi đơn mua đều trả bằng Ví LocalPress**. Ví đủ thì 1 nút. Ví thiếu thì trang tự tạo QR nạp bù đúng phần còn thiếu; SePay báo tiền nạp về thì backend tự trừ ví trả đơn.
**Ảnh**: `screenshots/01_thanh_toan_chung/01..05`, `screenshots/02_vi_nap_tien/07..08`.

| # | Phần tử | FE | API | BE controller | Service + luật | DB |
|---|---|---|---|---|---|---|
| 1 | Tải trang (đơn + số dư); khách chưa đăng nhập → `/login` | `PaymentPage.tsx:94` (`load`) | `payment.ts:69` `getOrder` → `GET /finance/orders/code/{code}`; `payment.ts:119` `getWallet` | `PaymentProcessingController.java:69` | `getPaymentView` :135: không thấy → 404, không phải chủ đơn → 403 (Rule 14) | `transactions`, `wallets` |
| 2 | Thẻ "Đơn hàng": loại, trạng thái, "Giữ đơn trong" mm:ss | `useCountdown`; hạn = `expiresAt` | (từ #1) | | `expires_at = now + order-ttl-minutes` (`application-dev.yml:49`) | `transactions.expires_at` |
| 3 | Khối "Thanh toán bằng Ví LocalPress": số dư, cần thanh toán, còn thiếu / số dư sau | `needsTopUp` :116 (= đơn còn chờ và số dư < số tiền) | | | | |
| 4 | **Ví đủ**: nút "Thanh toán X bằng ví" | `PaymentPage.tsx:428`, `handlePayWithWallet` :182 | `payment.ts:79` → `POST /orders/code/{code}/pay-with-wallet` | `:78` | `payWithWallet` :165: khóa dòng đơn, không phải chủ → 403, đơn TOPUP → 400, đã SUCCESS → trả luôn (bấm 2 lần không trừ 2 lần), hết hạn → 410; `debitAndMarkPaid` :372 trừ ví (thiếu → 402), đánh dấu SUCCESS `payment_method = WALLET`, phát `PaymentSuccessEvent` | `transactions`, `wallets` (CHECK `balance >= 0`), `wallet_entries` (UNIQUE `transaction_id, direction`) |
| 5 | **Ví thiếu**: tự tạo "Quét QR nạp bù X" | effect tại :119, tiêu đề :432 | `payment.ts:114` `createShortfallTopUp` → `POST /orders/code/{code}/shortfall-topup` | `:91` | `createShortfallTopUp` :191: tính `thiếu = số tiền đơn − số dư`; ví đủ → 409; đơn hết hạn → 410; **dùng lại** mã nạp bù còn hạn cùng số tiền, nếu không thì tạo đơn TOPUP mới đúng số thiếu, ghi `topup_for_order = mã đơn` | `transactions` (TOPUP, cột `topup_for_order`, V6) |
| 6 | QR + "Chép" (ngân hàng, STK, chủ TK, số tiền, nội dung = mã nạp) | `qrBlock` :315, `CopyRow` :491 | | | QR VietQR lấy STK/ngân hàng từ `application-secrets.yml` (`SePayService.generateVietQrUrl`) | |
| 7 | Tiền nạp bù về (webhook) → đơn tự thanh toán | (backend) | | | Nhánh TOPUP trong `processSepayIpn` (:277): cộng ví rồi `tryAutoPay` :385: khóa đơn, đơn còn chờ + còn hạn + `WalletService.lockedBalance` đủ → `debitAndMarkPaid`. Kết quả `PAID` / `INSUFFICIENT` (tiền giữ trong ví, trang tạo QR mới cho phần còn lại) / `ORDER_EXPIRED` / `ALREADY_PAID`. Kiểm tra số dư **trước** khi trừ để không ném 402 làm rollback cả tiền nạp | `transactions`, `wallets`, `wallet_entries` |
| 8 | Tự hỏi trạng thái 3 giây/lần (kèm số dư khi đang chờ nạp bù) | `:140`, `POLL_INTERVAL_MS` :24 | `payment.ts:74` `getStatus` → `GET /orders/code/{code}/status` | `:106` | | |
| 9 | "Tôi đã chuyển khoản, kiểm tra lại" | `handleCheckAgain` :166 (hỏi theo mã nạp bù nếu có) | `payment.ts:105` → `POST /orders/code/{code}/check-sepay` | `SepayGatewayController.java:64` | `checkOrderWithSepay`: hỏi API SePay đúng mã (cần `api-token`, chống spam 10 giây) | `sepay_webhook_logs` (API_SYNC) |
| 10 | Demo "Chuyển đủ X" / "Chuyển thiếu một nửa" / "Bắn lại webhook" (chỉ dev) | `handleSimulate` :197 (giả lập trên **mã nạp bù**) | `payment.ts:85` → `POST /orders/code/{code}/simulate-ipn` | `PaymentSimulationController.java` (`@Profile("dev")`) | Đi qua đúng `SepayGatewayService.receive`, log nguồn SIMULATION | như II.4.3 |
| 11 | Màn "Đã thanh toán" (phương thức "Trừ Ví LocalPress", số dư còn lại) / "Đơn đã hết hạn thanh toán" | `:241`, `:284` | | | Tiền đã nạp vẫn ở trong ví khi đơn hết hạn | |

**Kịch bản demo (2 phút)**
1. Đăng nhập khách có ví 0 ₫, mở đơn 15.000 ₫: trang báo "Còn thiếu 15.000 ₫" và hiện QR nạp bù 15.000 ₫, nội dung là mã nạp `LP...`.
2. Bấm "Chuyển thiếu một nửa": tiền vào ví, đơn vẫn chờ, QR đổi thành phần còn lại.
3. Bấm "Chuyển đủ": đơn tự chuyển "Đã thanh toán", khách không bấm gì thêm. Bấm "Bắn lại webhook" → `ALREADY_PROCESSED`, số dư không đổi.
4. Khách có ví đủ (sau khi nạp): chỉ còn 1 nút "Thanh toán bằng ví".
5. Bằng chứng tiền thật: xem mục II.4.3 "Đã test với tiền thật".

**Thầy hay hỏi**
- *Sao không cho trả QR thẳng vào đơn?* Một đường tiền duy nhất (QR → ví → đơn) nên dễ đối soát: tiền ngân hàng = tổng nạp ví; doanh thu = tổng trừ ví cho đơn (Rule 16). Chuyển thiếu / thừa / muộn không còn là ca đặc biệt vì tiền luôn nằm trong ví. Hoàn tiền cũng chỉ cần trả về ví.
- *Khách sửa URL `success` thì có được quyền không?* Không. Không có nút "tôi đã trả" cấp quyền; đơn chỉ SUCCESS khi server trừ ví, mà ví chỉ có tiền khi SePay xác nhận.
- *Tiền nạp bù về đúng lúc khách cũng bấm trả bằng ví ở tab khác?* Cả hai đều khóa dòng đơn; ai đến sau thấy đơn đã SUCCESS → không trừ lần 2 (`ALREADY_PAID`).
- *Đoán mã đơn của người khác?* `getPaymentView` / `createShortfallTopUp` trả 403.

**Sửa tại chỗ**
1. *Đổi thời gian giữ đơn 15 → 10 phút (BE + FE)*: `backend/src/main/resources/application-dev.yml:49` `order-ttl-minutes: 10`; mock `FE/api/payment.ts:240` `ORDER_TTL_MS = 10 * 60 * 1000`. Khởi động lại backend, tạo đơn mới: đếm ngược bắt đầu 09:59. Kiểm tra DB: `SELECT gateway_transaction_id, created_at, expires_at FROM transactions ORDER BY transaction_id DESC LIMIT 1;`
2. *Nạp bù tối thiểu 10.000 ₫ (làm tròn lên) thay vì đúng số thiếu (BE)*: trong `createShortfallTopUp` (:191), sau dòng tính `shortfall` thêm
   `shortfall = shortfall.max(new BigDecimal("10000")).divide(new BigDecimal("1000"), 0, RoundingMode.CEILING).multiply(new BigDecimal("1000"));`. Phần dư sau khi tự trả đơn nằm lại trong ví.
3. *Xem dấu vết 1 lần nạp bù (DB)*:
   `SELECT gateway_transaction_id, transaction_type, status, amount, topup_for_order, payment_method FROM transactions WHERE topup_for_order = '<mã đơn>' OR gateway_transaction_id = '<mã đơn>';` → thấy đơn TOPUP SUCCESS (SEPAY) và đơn mua SUCCESS (WALLET).

---

## II.4.2 Ví LocalPress & Nạp tiền — `/wallet`, `/wallet/topup` (UC047 loại TOPUP, UC050)

**Câu hỏi màn hình trả lời**: "Tôi còn bao nhiêu tiền trong ví, tiền vào ra thế nào?" và "Nạp bao nhiêu?"
**Ảnh**: `screenshots/02_vi_nap_tien/01..06`.

| # | Phần tử | FE | API | BE | Service + luật | DB |
|---|---|---|---|---|---|---|
| 1 | Số dư + bảng biến động | `WalletPage.tsx:27` (`load`) | `payment.ts:119` → `GET /finance/wallet/me` | `WalletController.java:34` (SC:75) | `WalletService.findByUserId`, `getEntries` (tối đa 100 dòng) | `wallets`, `wallet_entries` |
| 2 | Tổng "Nạp vào / Đã chi" | `WalletPage.tsx:34` (cộng từ các dòng đang hiện) | | | | |
| 3 | Nút "Nạp tiền" | `WalletPage.tsx:54` → `/wallet/topup` | | | | |
| 4 | Link "Đã chuyển tiền mà chưa được cộng?" | `:57` → `/wallet/complaints` | | | | |
| 5 | Nút chọn nhanh 50k…1tr | `TopUpPage.tsx:24` (`PRESETS`) | | | | |
| 6 | Ô "Hoặc nhập số tiền" + lỗi tiếng Việt | zod `TopUpPage.tsx:28` (10.000 - 50.000.000, số nguyên, bội số 1.000); form `noValidate` :83 để lỗi trình duyệt tiếng Anh không chen vào | | | | |
| 7 | "Nạp … qua QR SePay" | `onSubmit` :65 | `payment.ts:136` → `POST /finance/wallet/topups` | `WalletController.java:52` | `createTopUp` :113: ngoài hạn mức → 400, số lẻ → 400; tạo đơn TOPUP PENDING 15 phút → mở `/payment/:code` (chỉ QR) | `transactions` (`transaction_type = 'TOPUP'`, CHECK targets ở `V3:20`) |
| 8 | SePay báo tiền nạp | (II.4.3) | | | `processSepayIpn` nhánh TOPUP: cộng **đúng số tiền thực nhận**, kể cả về sau hạn QR | `wallets.balance`, `wallet_entries` CREDIT |

**Thầy hay hỏi**
- *Tiền nạp có phải doanh thu?* Không. Là công nợ phải trả khách (Rule 16). Doanh thu chỉ ghi khi khách tiêu ví hoặc trả QR cho đơn. `TransactionRepository.calculateTotalGrossRevenue` (:96) loại `TOPUP`; sổ quỹ FE cũng loại (`FE/api/index.ts:177`).
- *Ví âm được không?* Không: `wallets` có `CHECK (balance >= 0)` (`SQL/V3__wallet_and_topup.sql:39`), và `Wallet.debit` ném 402 trước khi xuống DB.
- *Webhook nạp gửi 2 lần?* Lần 2 đơn đã SUCCESS → `ALREADY_PROCESSED`; ngoài ra UNIQUE(`transaction_id`, `direction`) (`V3:52`).

**Sửa tại chỗ**
1. *Nạp tối thiểu 20.000 ₫ (FE + BE)*: `TopUpPage.tsx:25` `MIN_AMOUNT = 20000`; `application-dev.yml:50` `topup-min-amount: 20000`; mock `payment.ts:345`. Thử nạp 15.000: FE báo lỗi; gọi thẳng API bằng Postman cũng nhận 400.
2. *Thêm mức 2.000.000 ₫*: `TopUpPage.tsx:24` thêm `2000000` vào `PRESETS` (lưới tự xuống dòng).
3. *Chứng minh ràng buộc DB*: trong Workbench chạy `UPDATE wallets SET balance = -1 WHERE user_id = 6;` → lỗi `Check constraint 'chk_wallets_balance' is violated`. Rồi `INSERT INTO wallet_entries (...)` trùng `transaction_id, direction` → lỗi UNIQUE.

---

## II.4.3 Webhook SePay & Nhật ký SePay — `POST /api/v1/finance/webhook/sepay`, `/backoffice/finance/sepay` (UC048, UC049)

**Câu hỏi màn hình trả lời**: "Mỗi khoản tiền SePay báo về đã được xử lý ra sao, có chắc là tiền thật không?"
**Ảnh**: `screenshots/06_bao_cao_so_quy/06_nhat_ky_sepay.png`, `07_payload_sepay.png`.

**Đường đi của 1 khoản tiền (đọc theo thứ tự này khi thầy hỏi "webhook chạy thế nào")**
1. SePay gọi `POST /api/v1/finance/webhook/sepay` với header `Authorization: Apikey <key>` và JSON camelCase:
   `{"id":92704,"gateway":"Vietcombank","transactionDate":"...","content":"LP2610211402AB12 chuyen tien","transferType":"in","transferAmount":15000,"referenceCode":"MBVCB.3278907687",...}`
2. `PaymentProcessingController.java:118`: nhận body thô (để lưu nguyên văn), so khóa bằng `SePayService.verifyIpnSecretKey` (so sánh constant-time), parse JSON vào `SepayIpnRequest`.
3. `SepayGatewayService.receive` (:74):
   - sai khóa → log `INVALID_SIGNATURE`, trả **401** (:92);
   - `sepay_id` đã có trong log → `DUPLICATE_DELIVERY`, không xử lý lại (:99, Rule 5);
   - tiền ra (`transferType = out`) → bỏ qua (:105);
   - còn lại → `PaymentProcessingService.processSepayIpn` (:112).
4. `processSepayIpn` (`PaymentProcessingService.java:242`): tìm mã đơn bằng regex `LP\d{10}[A-Z0-9]{4}` trong `code` / `content` (`SepayIpnRequest.java:39`, :125), khóa dòng đơn, rồi rẽ nhánh: đã SUCCESS → `ALREADY_PROCESSED` (:259); TOPUP → cộng ví; đơn đóng / quảng cáo quá hạn → vào ví `-LATE` (:287); thiếu → vào ví `-PART-<ref>` (:297); đủ/thừa → SUCCESS + `PaymentSuccessEvent`, thừa vào ví (:311).
5. Ghi 1 dòng `sepay_webhook_logs` (payload gốc, kết quả, IP), trả **200 `{"success": true}`**. SePay chỉ coi là giao thành công khi nhận đúng như vậy; nếu không, SePay gửi lại tối đa 7 lần trong 5 giờ.
6. Lỗi bất ngờ → 500 và **không** ghi `sepay_id`, để lần SePay gửi lại vẫn được xử lý.

| # | Phần tử (màn Nhật ký) | FE | API | BE | Ghi chú |
|---|---|---|---|---|---|
| 1 | Tải nhật ký + cấu hình | `SepayLogPage.tsx:60` | `payment.ts:196`, `:201` → `GET /finance/sepay/logs`, `/sepay/status` | `SepayGatewayController.java:38`, `:47` (SC:78 + `requireFinanceStaff`) | `recentLogs` :243, `configStatus` :250 (che số tài khoản) |
| 2 | KPI "Tiền thật đã ghi nhận" | `:94` (`realTotal`) | | | Chỉ cộng nguồn WEBHOOK / API_SYNC đã ghi nhận; bỏ giả lập |
| 3 | Lọc Nguồn: Webhook / Đồng bộ API / Giả lập | `Segmented` | `?source=` | `findBySourceOrderByReceivedAtDesc` | |
| 4 | "Đồng bộ từ SePay" | `handleSync` :78 | `POST /finance/sepay/sync?hours=24` | `:53` | `syncFromSepay` :139: gọi `GET https://my.sepay.vn/userapi/transactions/list` (Bearer token), bỏ giao dịch đã có `sepay_id`, đẩy phần còn lại qua đúng `receive()` |
| 5 | "Payload" | `:202`, `formatJson` :235 | | | Xem nguyên văn JSON SePay gửi |
| 6 | Khung cảnh báo "Chưa nhận webhook thật" | | | | Hướng dẫn chạy tunnel, URL cần dán vào SePay |

**Đã test với tiền thật (22/10/2026, 02:17)**

| Bước | Kết quả |
|---|---|
| Khách nạp 10.000 ₫, quét QR VietQR (TPBank), nội dung `LP2610220216AEA5` | Chuyển từ app ngân hàng thật |
| SePay gọi webhook qua Cloudflare tunnel, IP `171.244.35.2` | Ghi `sepay_webhook_logs` #41: nguồn WEBHOOK, `sepay_id` 92084035, khóa hợp lệ, kết quả SUCCESS |
| Payload thật | Field camelCase: `id`, `transferAmount`, `transferType`, `referenceCode`; `code` = null; nội dung ngân hàng dính chữ: `MBVCB.16656331355.6295BFTVGLC62DPG.LP2610220216AEA5.CT tu ...` |
| Kết quả | Đơn TOPUP → SUCCESS lúc 02:17:00, ví +10.000 ₫ (`wallet_entries` CREDIT), trang thanh toán tự chuyển "Đã thanh toán" |

Hai chỗ sửa ngày 21/10 đều cần thiết. Bản cũ đọc `amount` / `reference_code`, nên sẽ ra số tiền 0. Bản cũ tách mã đơn theo khoảng trắng / dấu phẩy, mà nội dung có dấu chấm dính liền mã đơn, nên sẽ báo không tìm thấy đơn. Bản mới dò bằng regex `LP\d{10}[A-Z0-9]{4}`.
Bài học: SePay chỉ gửi webhook cho giao dịch xảy ra **sau khi** webhook được tạo. Khoản chuyển trước đó (đơn `LP26102202065B56`) được lấy lại bằng khiếu nại UC051.

**Kiểm chứng ngay bằng lệnh (backend thật)**
```bash
curl -s -X POST http://localhost:8080/api/v1/finance/webhook/sepay -H "Content-Type: application/json" -H "Authorization: Apikey <webhook-api-key>" -d "{\"id\":900001,\"gateway\":\"Vietcombank\",\"content\":\"<MÃ ĐƠN> chuyen tien\",\"transferType\":\"in\",\"transferAmount\":15000,\"referenceCode\":\"FT900001\"}"
```
Chạy lần 2 cùng `id` → `ALREADY_PROCESSED`. Đổi khóa → HTTP 401. Kiểm tra DB:
`SELECT log_id, source, sepay_id, result_status, order_code, transfer_amount FROM sepay_webhook_logs ORDER BY log_id DESC LIMIT 5;`

**Thầy hay hỏi**
- *Rule 4 ghi HMAC SHA512, sao dùng API Key?* Webhook biến động số dư của SePay hỗ trợ API Key, HMAC-SHA256, OAuth2. Nhóm chọn API Key qua header, so sánh constant-time, kèm idempotent theo `sepay_id`. Có thể chuyển sang HMAC trên dashboard SePay mà không đổi luồng xử lý.
- *Máy local thì SePay gọi vào kiểu gì?* Qua tunnel (`backend/scripts/sepay-tunnel.ps1`). Không có tunnel vẫn lấy được giao dịch thật bằng API SePay (nút Đồng bộ / Kiểm tra lại). Cả hai đường đều vào cùng `receive()` nên không ghi nhận trùng.
- *Khách ghi sai nội dung chuyển khoản?* Không tìm thấy mã → `ORDER_NOT_FOUND`, vẫn trả `success:true` (gửi lại cũng vô ích), khoản tiền nằm trong nhật ký chờ khách khiếu nại (II.4.4).

**Sửa tại chỗ**
1. *Lưu thêm số dư tài khoản (`accumulated`) SePay gửi (DB + BE + FE)*:
   - SQL: tạo `SQL/V6__sepay_log_accumulated.sql`: `ALTER TABLE sepay_webhook_logs ADD COLUMN accumulated DECIMAL(16,2) NULL;`
   - Entity `BE/model/SepayWebhookLog.java`: thêm `@Column(name = "accumulated") private BigDecimal accumulated;`
   - `SepayGatewayService.receive`: builder thêm `.accumulated(ipn != null ? ipn.getAccumulated() : null)`. DTO đã có field `accumulated`.
   - FE: `SepayLog` trong `FE/types/index.ts` + `toSepayLog` trong `payment.ts`, rồi thêm 1 `KeyValue` trong dialog Payload.
2. *Lọc theo kết quả (chỉ xem ORDER_NOT_FOUND)*: FE thêm `Segmented` thứ hai và lọc `logs` theo `resultStatus`. BE (tùy chọn): repo `findByResultStatusOrderByReceivedAtDesc`.
3. *Chặn webhook từ IP lạ*: trong `handleSepayWebhook` (`PaymentProcessingController.java:118`) so `clientIp(request)` (:142) với danh sách IP SePay đặt trong `application-dev.yml`; sai thì trả 403 và vẫn ghi log.

---

# ITERATION 2 — GIỮA LUỒNG: KẾ TOÁN GHI NHẬN, XỬ LÝ NGOẠI LỆ, CHỨNG TỪ

## II.4.4 Khiếu nại thanh toán (khách) — `/wallet/complaints` (UC051, phía khách)

**Câu hỏi**: "Tôi đã chuyển tiền mà chưa thấy ghi nhận, làm sao báo?"
**Ảnh**: `screenshots/03_khieu_nai/01_form_khieu_nai.png`, `02_da_gui.png`.

| # | Phần tử | FE | API | BE | Service + luật | DB |
|---|---|---|---|---|---|---|
| 1 | Danh sách "Khiếu nại của tôi" | `PaymentComplaintPage.tsx:64` | `payment.ts:152` → `GET /finance/complaints/me` | `PaymentComplaintController.java:43` (SC:77) | `listMine` → `findByUserIdOrderByCreatedAtDesc` | `payment_complaints` (index `user_id, created_at`) |
| 2 | Các ô: số tiền, thời gian, mã GD ngân hàng, mã đơn, ghi chú; mở từ trang thanh toán thì điền sẵn | zod `:26`; form `noValidate` | | | DTO `CreateComplaintRequest`: `@DecimalMin 1000`, `@PastOrPresent`, `@NotBlank bankReference` | |
| 3 | "Gửi khiếu nại" | `onSubmit` :74 | `payment.ts:147` → `POST /finance/complaints` | `:37` | `PaymentComplaintService.create` :46: mã GD đã khiếu nại → 409 (:48); mã đơn không có → 404; đơn người khác → 403; hợp lệ → OPEN | `payment_complaints` (UNIQUE `bank_reference`, CHECK `amount > 0`) |
| 4 | Pill trạng thái + phản hồi kế toán | `ComplaintStatusBadge` (`ComplaintQueuePage.tsx:29`) | | | | `status`, `resolution_note` |

**Thầy hay hỏi**: *Sao không cho kế toán "duyệt chuyển khoản" như tracking cũ?* Vì kế toán bấm PAID tay là lỗ hổng gian lận nội bộ. Bây giờ kế toán chỉ "ghi nhận vào đơn" sau khi đối chiếu sao kê, và việc ghi nhận chạy lại đúng hàm webhook (idempotent). Nên nếu webhook thật về sau thì không bị cộng 2 lần.

**Sửa tại chỗ**
1. *Bắt buộc nhập mã đơn*: FE zod `orderCode: z.string().min(1, 'Vui lòng nhập mã đơn')` (`:26`); BE `CreateComplaintRequest.java:22` thêm `@NotBlank`; DB `V6__...sql`: `ALTER TABLE payment_complaints MODIFY order_code VARCHAR(255) NOT NULL;` (chạy sau khi đã sửa dữ liệu NULL cũ).
2. *Chỉ cho khiếu nại sau 15 phút kể từ lúc chuyển*: FE thêm `.refine((v) => Date.now() - Date.parse(v) >= 15*60*1000, 'Hệ thống thường ghi nhận trong 15 phút, vui lòng chờ thêm')` cho `transferredAt`; BE trong `create` so `request.getTransferredAt()` với `LocalDateTime.now().minusMinutes(15)` → 400.
3. *Chứng minh UNIQUE ở DB*: gửi 2 khiếu nại cùng mã GD → lần 2 nhận 409 (service), và `INSERT` trùng trong Workbench → lỗi `uk_payment_complaints_bank_ref`.

---

## II.4.5 Hàng chờ khiếu nại (kế toán) — `/backoffice/finance/complaints` (UC051, phía kế toán)

**Câu hỏi**: "Khoản tiền khách báo có thật trên sao kê không, ghi nhận vào đâu?"
**Ảnh**: `screenshots/03_khieu_nai/03..05`.

| # | Phần tử | FE | API | BE | Service + luật | DB |
|---|---|---|---|---|---|---|
| 1 | Lọc: Chờ đối soát / Đã ghi nhận / Từ chối / Tất cả | `FILTERS` :35, `load` :51 | `payment.ts:157` → `GET /finance/complaints?status=` | `PaymentComplaintController.java` `listForAccountant` + `requireFinanceStaff` :78 (403) | `listForAccountant` :83: có trạng thái thì cũ nhất trước (xử lý theo thứ tự) | `payment_complaints` (index `status, created_at`) |
| 2 | "Ghi nhận vào đơn" (chỉ khi có mã đơn) → hộp xác nhận "Đã khớp sao kê" | nút trong bảng, `ConfirmDialog` :188, `run` :57 | `payment.ts:162` → `POST /complaints/{id}/resolve?target=ORDER` | `:57` | `resolve` :94: khóa dòng khiếu nại, không OPEN → 409; ORDER (:103) → gọi lại **`processSepayIpn`** với mã GD làm reference; đơn đã ghi nhận trước → 409 | `payment_complaints`, `transactions`, `wallets`, `wallet_entries` |
| 3 | "Cộng vào ví" | | `target=WALLET` | | Đơn còn PENDING và còn hạn → 409 (phải ghi vào đơn, tránh ghi 2 lần); còn lại `creditUnmatchedTransfer` (:126) tạo TOPUP `CMP-<mã GD>`, idempotent | `transactions`, `wallets`, `wallet_entries` |
| 4 | "Từ chối" → ô lý do → "Từ chối" | `setRejecting` :171 | `payment.ts:167` → `POST /complaints/{id}/reject` | `:68` | `reject` :139 → `PaymentComplaint.reject`: thiếu lý do → 400 | `payment_complaints.resolution_note` (khách nhìn thấy) |

**Thầy hay hỏi**: *2 kế toán bấm cùng lúc?* `findByIdForUpdate` khóa dòng; người sau gặp trạng thái không còn OPEN → 409.

**Sửa tại chỗ**
1. *Bắt buộc ghi chú khi ghi nhận*: FE thêm ô ghi chú vào `ConfirmDialog` (hoặc `Input` như nhánh từ chối) và truyền `note` vào `complaintApi.resolve`; BE trong `resolve` (:94) nếu `note` trống → `throw new AppException("Nhập ghi chú đối chiếu sao kê", HttpStatus.BAD_REQUEST)`.
2. *Thêm cột "Gửi lúc"*: `createdAt` đã có trong `toComplaint` (`payment.ts`); thêm `<th>` và `<td>{formatDateTime(c.createdAt)}</td>` trong `ComplaintQueuePage.tsx`.
3. *SQL xem dấu vết*: `SELECT complaint_id, status, resolution, resolved_by, resolved_at FROM payment_complaints ORDER BY complaint_id DESC;` rồi `SELECT gateway_transaction_id, transaction_type, amount FROM transactions WHERE gateway_transaction_id LIKE 'CMP-%';`

---

## II.4.6 Đơn thanh toán & Chứng từ — `/backoffice/finance/orders`, `/orders/:id` (UC057)

**Câu hỏi**: "Đơn nào đã thu, thu bằng gì, in chứng từ cho đơn nào?"
**Ảnh**: `screenshots/06_bao_cao_so_quy/02..04`.

| # | Phần tử | FE | API | BE | Service + luật | DB |
|---|---|---|---|---|---|---|
| 1 | Tải danh sách (100 dòng mới nhất) | `OrderListPage.tsx:54` | `FE/api/index.ts:69` → `GET /finance/ledger?size=100` | `FinanceLedgerController.java:37` (SC:78) | `getLedgerEntries` :56 → `TransactionRepository.searchLedger` :75 | `transactions` |
| 2 | Loại đơn kèm số đếm | `TYPE_OPTIONS` :10, `typeCounts` :82 | FE lọc | | Số đếm tính theo trạng thái đang chọn | |
| 3 | Chọn trạng thái | `STATUS_OPTIONS` :17 | FE lọc | | Backend `SUCCESS` → FE `PAID` | |
| 4 | Tìm "Mã đơn, khách hàng, dịch vụ" | `filteredOrders` :67 | FE lọc | | | |
| 5 | Loại đơn đúng tên (kể cả Nạp ví, Hoàn tiền) | `mapOrderType` `index.ts:13` | | | | `transactions.transaction_type` |
| 6 | "Chi tiết" → trang chi tiết | `:182` | `index.ts:103` → `GET /finance/ledger/{id}` | `FinanceLedgerController.java:50` | `getTransactionDetail` :90 (404) | `transactions` |
| 7 | "In chứng từ" → hóa đơn điện tử | `OrderDetailPage.tsx:94`; VAT :70 (`finalAmount × 0,1 / 1,1`) | FE dựng từ dữ liệu đơn | | Chỉ đơn đã thanh toán mới có nút | |
| 8 | "In hoặc lưu PDF" | `:231` `window.print()` | | | | |
| 9 | "Lập đề xuất hoàn tiền" | `:89` → `/backoffice/finance/refunds?orderId=` | (Iter 3) | | | |

**Sửa tại chỗ**
1. *Lọc theo phương thức thanh toán ở server*: backend **đã hỗ trợ** `paymentMethod` (`LedgerFilterRequest.java:37`, query `searchLedger`). Chỉ cần FE thêm `<select>` cạnh ô trạng thái, rồi gọi `httpClient.get('/finance/ledger', { params: { size: 100, paymentMethod } })` ở `index.ts:69`.
2. *Đổi thuế GTGT 10% → 8%*: `OrderDetailPage.tsx:70` `Math.round(order.finalAmount * 0.08 / 1.08)`, sửa nhãn "Trong đó thuế GTGT 8%".
3. *Ẩn nút hoàn tiền với đơn trả bằng ví*: điều kiện quanh `OrderDetailPage.tsx:89`: `order.paymentStatus === 'PAID' && order.paymentMethod !== 'WALLET'`. Giải thích: hoàn đơn ví thì trả lại ví, nghiệp vụ có thể muốn tách riêng.

---

## II.4.7 Sổ quỹ — `/backoffice/finance/ledger` (UC058)

**Câu hỏi**: "Tiền đã thu, đã hoàn là bao nhiêu, số dư ròng?"
**Ảnh**: `screenshots/06_bao_cao_so_quy/05_so_quy.png`.

| # | Phần tử | FE | API | BE | Ghi chú |
|---|---|---|---|---|---|
| 1 | Tải bút toán | `GeneralLedgerPage.tsx:16` | `index.ts:173` → `GET /finance/ledger?size=100` | `FinanceLedgerController.java:37` → `searchLedger` | FE chỉ giữ giao dịch SUCCESS / REFUNDED và **loại TOPUP** (Rule 16, `index.ts:177`) |
| 2 | KPI Số dư ròng / Thu (Có) / Hoàn (Nợ) | `:29` | | | Tính từ chính các dòng trên bảng nên luôn khớp tổng cuối bảng |
| 3 | Dòng "Cộng phát sinh" | `:92` | | | |

**Thầy hay hỏi**: *Số trên sổ quỹ có khớp dashboard không (Rule 16)?* Cùng định nghĩa: doanh thu = SUCCESS + REFUNDED, loại TOPUP và REFUND (`TransactionRepository.calculateTotalGrossRevenue` :96), trừ tiền hoàn đúng 1 lần.

**Sửa tại chỗ**
1. *Lọc theo khoảng ngày*: backend **đã có** `fromDate`/`toDate` (`LedgerFilterRequest.java:42-49`, `searchLedger`). FE thêm 2 ô `type="date"` và gửi `params: { fromDate: '2026-10-01T00:00:00', toDate: '2026-10-31T23:59:59' }` ở `index.ts:173`.
2. *Lọc theo khoảng tiền (BE + FE, sửa sâu)*:
   - `LedgerFilterRequest.java`: thêm `private BigDecimal minAmount; private BigDecimal maxAmount;`
   - Query `searchLedger` (`TransactionRepository.java`, khối `@Query` ngay trên :75): thêm `AND (:minAmount IS NULL OR t.amount >= :minAmount) AND (:maxAmount IS NULL OR t.amount <= :maxAmount)` và 2 `@Param`.
   - `FinanceLedgerService.getLedgerEntries` (:56): truyền 2 tham số mới.
   - FE gửi `params: { minAmount, maxAmount }`.
3. *Đối chiếu bằng SQL*: `SELECT SUM(amount) FROM transactions WHERE status IN ('SUCCESS','REFUNDED') AND transaction_type NOT IN ('REFUND','TOPUP');` phải bằng "Phát sinh thu" trên màn hình.

---

## Phụ lục A. Bảng dữ liệu SV4 hay bị hỏi

| Bảng | Migration | Ràng buộc quan trọng |
|---|---|---|
| `transactions` | V1, sửa ở V3 | UNIQUE `gateway_transaction_id` (mã đơn); CHECK chỉ gắn đúng 1 đối tượng (TOPUP không gắn gì, V3:20) |
| `wallets` | V3 | UNIQUE `user_id`; CHECK `balance >= 0` |
| `wallet_entries` | V3 | UNIQUE(`transaction_id`, `direction`) chống cộng/trừ trùng; CHECK `amount > 0` |
| `payment_complaints` | V4 | UNIQUE `bank_reference`; CHECK `amount > 0` |
| `sepay_webhook_logs` | V5 | UNIQUE `sepay_id` (chống xử lý trùng); lưu `raw_payload` |

## Phụ lục B. Chỗ chưa làm (nói trước để không bị bắt bất ngờ)

| Chỗ | Trạng thái | Cách trả lời |
|---|---|---|
| Webhook SePay thật vào máy local | Cần tunnel; đã có script + đường dự phòng API SePay | Demo bằng nhật ký: giả lập có nhãn "Giả lập", tiền thật có `sepay_id` |
| SV1 / SV3 chưa viết `@EventListener PaymentSuccessEvent` | SV4 đã phát sự kiện đúng hợp đồng (AGENTS.md mục 5) | Rule 17: SV4 không sửa bảng của module khác |
| Vai trò Kế toán trưởng `FINANCE_MANAGER` chưa có trong bảng `users` | Ở API thật dùng `SYSTEM_ADMIN` để duyệt mắt 2 / chốt kỳ | Thuộc Iter 3 |
| Hóa đơn điện tử là chứng từ mô phỏng, dựng ở FE | Không ký số thật | UC057 ghi "simulated financial documents" |
