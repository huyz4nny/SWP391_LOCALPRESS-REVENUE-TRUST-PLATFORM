---
name: iter-review
description: >-
  Iteration Review and Defense Playbook for LocalPress (SWP391).
  Provides complete mapping matrix (Use Cases to Frontend URLs, Backend APIs, Controllers, Services, DB Tables),
  end-to-end activity flows, browser navigation links, and code modification guidelines for live coding during teacher reviews.
---

# LocalPress Iteration Review & Defense Playbook

> **Môn học:** SWP391 — Học kỳ FALL 2026 — Đại học FPT  
> **Dự án:** LocalPress — Revenue & Trust Platform (Báo điện tử địa phương)  
> **Mục tiêu tài liệu:** Cẩm nang tra cứu tức thì khi Review cá nhân 1-1 trên lớp với Giảng viên. Giúp sinh viên trả lời trôi chảy 5 nội dung review: (1) Luồng Swimlane, (2) Chi tiết Use Case, (3) Demo & Giải thích code, (4) Thiết kế DB & Kiến trúc, (5) Sửa code theo yêu cầu (Live-coding).

---

## 1. BẢNG MAPPING TỔNG HỢP: USE CASE ↔ LINK UI ↔ CODE ↔ DATABASE

Bảng tra cứu nhanh "Thầy hỏi chức năng nào — mở link nào — code nằm ở file nào — dữ liệu lưu ở bảng nào".

### 1.1. Phân hệ SV4: Kế toán, Thanh toán & Đối soát (Huy - Leader)
*Tài khoản demo:* Kế toán (mắt 1) `ketoan@localpress.vn` / `password` (`ACCOUNTANT`) | Người duyệt mắt 2 `admin@localpress.vn` / `password` | Độc giả `reader.an@gmail.com` | Doanh nghiệp `adv.canghaiphong@gmail.com`  
*Swimlane:* `docs/sv4/01_output/SWIMLANE_SV4.md` (7 sơ đồ tiếng Anh, PNG trong `docs/sv4/01_output/diagrams/`, mỗi sơ đồ 1 điểm kết thúc) | *Use case:* `docs/sv4/01_output/USECASE_SV4.md` | *DB:* `docs/sv4/01_output/DB_CHANGES_SV4.md`

**Màn hình khách hàng (dùng chung cho SV1/SV3, luồng SV4 bắt đầu tại đây):**

| Use Case | Chức năng / Màn hình | Link UI | File Frontend | Backend API Endpoint | Backend Controller & Service | Bảng CSDL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UC047** (+ Pay with Wallet) | **Trang thanh toán chung** (II.4.3 Payment Processing) | `/payment/:orderCode` (route cũ `/checkout/:orderId` redirect sang đây) | `features/finance/pages/PaymentPage.tsx` | `POST /api/v1/finance/orders` (module nguồn gọi)<br>`POST /api/v1/finance/orders/code/{code}/pay-with-wallet` | `PaymentProcessingController.java`<br>`PaymentProcessingService.java`<br>`WalletService.java` | `transactions`<br>`wallets`<br>`wallet_entries` |
| **UC048, UC049** | **Webhook IPN SePay** (II.4.3) | không có UI (SePay gọi); dev: nút "Chuyển đủ tiền" / "Chuyển thiếu 50%" / "Bắn lại webhook" trên `/payment/:orderCode` | `PaymentPage.tsx` | `POST /api/v1/finance/webhook/sepay`<br>`POST /api/v1/finance/orders/code/{code}/simulate-ipn` (chỉ profile dev) | `PaymentProcessingController.java`<br>`PaymentProcessingService.processSepayIpn`<br>`SePayService.verifyIpnSecretKey` | `transactions`<br>`wallet_entries`<br>`audit_logs` |
| **UC050** | **Kiểm tra trạng thái** (II.4.3) | `/payment/:orderCode` (polling 3s, nút "Tôi đã chuyển khoản") | `PaymentPage.tsx` | `GET /api/v1/finance/orders/code/{code}/status` | `PaymentProcessingService.getOrderStatusByCode` | `transactions` |
| Top-up Wallet (incl. UC047) | **Ví LocalPress / Nạp tiền** | Header `WalletBalanceButton` -> `/wallet`, `/wallet/topup` -> `/payment/:orderCode` | `WalletBalanceButton`, trang `/wallet`, `/wallet/topup` *(session code đang làm)* | `POST /api/v1/finance/wallet/topups`<br>`GET /api/v1/finance/wallet/**` | `WalletService.java` | `wallets`<br>`wallet_entries`<br>`transactions` (`TOPUP`) |
| **UC051** (phía khách) | **Gửi khiếu nại thanh toán chưa ghi nhận** | Link trên `/payment/:orderCode` và `/wallet` -> `/wallet/complaints` | `PaymentComplaintPage.tsx` | `POST /api/v1/finance/complaints`<br>`GET /api/v1/finance/complaints/me` | `PaymentComplaintController.java`<br>`PaymentComplaintService.java` | `payment_complaints` |

**Màn hình backoffice kế toán (8 màn hình II.4.1 - II.4.8):**

| Use Case | Màn hình | Iter | Link UI | File Frontend | Backend API Endpoint | Backend Controller & Service | Bảng CSDL |
| :--- | :--- | :-: | :--- | :--- | :--- | :--- | :--- |
| **UC057, UC058** | **II.4.1 Financial Documents and Ledger** | 1 | `/backoffice/finance/ledger` | `GeneralLedgerPage.tsx` | `GET /api/v1/finance/ledger`<br>`GET /api/v1/finance/ledger/{id}`<br>`GET /api/v1/finance/ledger/summary` | `FinanceLedgerController.java`<br>`FinanceLedgerService.java` | `transactions` |
| **UC051** (include UC049) | **II.4.2 Hàng chờ khiếu nại thanh toán** (Handle Unrecorded Payment Complaint) | 1 | `/backoffice/finance/complaints` (menu "Khiếu nại thanh toán") | `ComplaintQueuePage.tsx` | `GET /api/v1/finance/complaints?status=OPEN`<br>`POST /api/v1/finance/complaints/{id}/resolve?target=ORDER\|WALLET`<br>`POST /api/v1/finance/complaints/{id}/reject` | `PaymentComplaintController.java`<br>`PaymentComplaintService.java`<br>(ghi nhận vào đơn gọi `PaymentProcessingService.processSepayIpn`) | `payment_complaints`<br>`transactions`<br>`wallet_entries` |
| **UC047, UC048, UC049, UC050** | **II.4.3 Payment Processing** | 2 | `/payment/:orderCode` (bảng trên) | `PaymentPage.tsx` | xem bảng trên | `PaymentProcessingController.java` | `transactions` |
| **UC053** | **II.4.4 Advertiser Receivables** | 2 | `/backoffice/finance/orders?type=AD` *(chưa có trang riêng)* | `OrderListPage.tsx` | `GET /api/v1/finance/receivables` | `AdvertiserReceivablesController.java`<br>`AdvertiserReceivablesService.java` | `transactions`<br>`ad_campaigns` (chỉ đọc) |
| **UC052** | **II.4.5 Cash Flow Dashboard** | 3 | `/backoffice/finance` | `FinanceDashboard.tsx` | `GET /api/v1/finance/dashboard` | `FinanceDashboardController.java` | `transactions` |
| **UC054** | **II.4.6 Payment Reconciliation** | 3 | `/backoffice/finance/reconciliation` | `ReconciliationPage.tsx` | `GET /api/v1/finance/reconciliation`<br>`POST /api/v1/finance/reconciliation/resolve`<br>`POST /api/v1/finance/reconciliation/close` | `FinanceReconciliationController.java`<br>`FinanceReconciliationService.java` | `transactions`<br>`audit_logs` |
| **UC055, UC056** | **II.4.7 Refund and Rights Management** | 3 | `/backoffice/finance/refunds` | `RefundManagementPage.tsx` | `GET /api/v1/finance/refunds`<br>`POST /api/v1/finance/refunds/propose`<br>`POST /api/v1/finance/refunds/{id}/review-refund` | `RefundManagementController.java`<br>`RefundManagementService.java` | `refund_requests`<br>`transactions` |
| **UC059, UC060** | **II.4.8 Financial Reports and Alerts** | 3 | *(chưa có route FE, gọi API trực tiếp)* | — | `GET /api/v1/finance/reports/export` (CSV)<br>`GET /api/v1/finance/alerts` | `FinanceReportController.java` | `transactions`<br>`refund_requests`<br>`audit_logs` |

---

### 1.2. Phân hệ SV1: Doanh nghiệp & Cổng B2B (Tây)
*Tài khoản demo:* `adv.canghaiphong@gmail.com` | *Mật khẩu:* `password` | *Vai trò:* `ADVERTISER`

| Use Case | Chức năng / Màn hình | Link UI (Mở link nào) | File Frontend | Backend API Endpoint | Backend Controller & Service | Bảng CSDL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UC002** | **Hồ sơ Doanh nghiệp** (II.1.1) | `/advertiser/profile` | `CompanyProfilePage.tsx` | `GET/PUT /api/v1/advertiser/profile` | `AdvertiserProfileController.java` | `advertisers`<br>`users` |
| **UC003** | **Danh mục Vị trí Banner** (II.1.2) | `/advertiser/slots` | `AdSlotsExplorerPage.tsx` | `GET /api/v1/advertising/ad-slots` | `AdvertisingController.java` | `ad_slots` |
| **UC004, UC005** | **Đặt Chiến dịch & Báo giá** (II.1.3, II.1.4) | `/advertiser/bookings/new` | `NewBookingPage.tsx` | `POST /api/v1/advertising/bookings` | `AdBookingController.java` | `ad_campaigns`<br>`ad_slots` |
| **UC006, UC007** | **Thanh toán Quảng cáo** (II.1.5) | `/advertiser/billing` hoặc `/advertiser/bookings/:id` | `AdvertiserBillingPage.tsx`<br>`BookingDetailPage.tsx` | `POST /api/v1/finance/orders` *(Gọi SV4)* | `AdvertisingPaymentService.java` | `transactions`<br>`ad_campaigns` |
| **UC008** | **Nộp Banner Creative** (II.1.6) | `/advertiser/campaigns/:id` | `CampaignDetailPage.tsx` | `POST /api/v1/advertising/creatives` | `AdCreativeController.java` | `ad_creatives` |
| **UC001, UC011** | **Báo cáo Hiệu suất CTR** (II.1.7) | `/advertiser` | `AdvertiserDashboard.tsx` | `GET /api/v1/advertising/stats` | `AdStatsController.java` | `ad_stats` |

---

### 1.3. Phân hệ SV2: Tòa soạn, Vận hành & Phê duyệt (Trọng Phan)
*Tài khoản demo:* `bientap@localpress.vn` | *Mật khẩu:* `password` | *Vai trò:* `EDITOR`

| Use Case | Chức năng / Màn hình | Link UI (Mở link nào) | File Frontend | Backend API Endpoint | Backend Controller & Service | Bảng CSDL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UC025** | **Duyệt & Xuất bản Bài viết** (II.2.1) | `/backoffice/editorial/articles` | `ArticleListPage.tsx` | `GET /api/v1/editorial/articles`<br>`POST /api/v1/editorial/articles/{id}/publish` | `ArticleReviewController.java` | `articles`<br>`article_versions` |
| **UC026, UC027** | **Kiểm duyệt Bình luận** (II.2.2) | `/backoffice/editorial/comments` | `CommentModerationPage.tsx` | `GET /api/v1/editorial/comments`<br>`POST /api/v1/editorial/comments/{id}/approve`<br>`POST /api/v1/editorial/comments/{id}/reject` | `CommentModerationController.java` | `comments` |
| **UC016** | **Hàng đợi Booking chờ duyệt** (II.2.3) | `/backoffice/editorial/bookings` | `BookingManagementPage.tsx` | `GET /api/v1/editorial/bookings/pending` | `BookingReviewController.java` | `ad_campaigns` |
| **UC020, UC021** | **Kiểm duyệt Banner Creative** (II.2.6) | `/backoffice/editorial/creatives` | `CreativeReviewPage.tsx` | `GET /api/v1/editorial/creatives/pending`<br>`POST /api/v1/editorial/creatives/{id}/approve` | `CreativeReviewController.java` | `ad_creatives` |

---

### 1.4. Phân hệ SV3: Khách & Độc giả (Hoàng)
*Tài khoản demo:* `reader.an@gmail.com` (Độc giả Free) / `reader.mai@gmail.com` (Độc giả VIP) | *Mật khẩu:* `password` | *Vai trò:* `READER`

| Use Case | Chức năng / Màn hình | Link UI (Mở link nào) | File Frontend | Backend API Endpoint | Backend Controller & Service | Bảng CSDL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UC029, UC030** | **Trang chủ & Tìm kiếm** (II.3.1) | `/` và `/search?q=...` | `HomePage.tsx`<br>`SearchPage.tsx` | `GET /api/v1/reader/articles/public`<br>`GET /api/v1/reader/search` | `PublicArticleController.java` | `articles`<br>`categories` |
| **UC031, UC032** | **Đọc báo Free 100%** (II.3.2) | `/articles/:slug` | `ArticleDetailPage.tsx` | `GET /api/v1/reader/articles/{slug}` | `PublicArticleController.java` | `articles`<br>`article_versions` |
| **UC034, UC035** | **Xem & Mua Gói Hội Viên** (II.3.4) | `/premium` $\rightarrow$ `/checkout/:orderId` | `PremiumPlansPage.tsx`<br>`CheckoutPage.tsx` | `GET /api/v1/reader/plans`<br>`POST /api/v1/finance/orders` *(Gọi SV4)* | `SubscriptionController.java` | `subscription_plans`<br>`transactions` |
| **UC036** | **Đọc bài Premium (Paywall Preview)** | `/articles/tham-nhap-duong-day-buon-lau...` | `ArticleDetailPage.tsx`<br>`PaywallPrompt.tsx` | `GET /api/v1/delivery/articles/{slug}` *(SV5)* | `PaywallEngine.java` *(SV5)* | `articles`<br>`article_purchases` |
| **UC037, UC038** | **Tủ sách Cá nhân & Bài đã lưu** (II.3.6) | `/account/library`<br>`/account/bookmarks` | `ReaderLibraryPage.tsx`<br>`ReaderBookmarksPage.tsx` | `GET /api/v1/reader/saved-articles` | `ReaderLibraryController.java` | `saved_articles`<br>`article_purchases` |
| **UC043** | **Quản lý Phiên & 2 Thiết bị** (II.3.9) | `/account/devices` | `ReaderDevicesPage.tsx` | `GET /api/v1/reader/devices`<br>`DELETE /api/v1/reader/devices/{id}` | `UserDeviceController.java` | `user_devices` |

---

### 1.5. Phân hệ SV5: Hệ thống, Paywall, Ad Serving & AI (Tùng)
*Tài khoản demo:* `phongvien@localpress.vn` (Phóng viên CMS) / `admin@localpress.vn` (System Admin) | *Mật khẩu:* `password`

| Use Case | Chức năng / Màn hình | Link UI (Mở link nào) | File Frontend | Backend API Endpoint | Backend Controller & Service | Bảng CSDL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UC061, UC063** | **Soạn thảo Bài viết & Media** (II.5.1, II.5.2) | `/backoffice/editorial/articles/new` | `ArticleEditorPage.tsx` | `POST /api/v1/content/articles/draft` | `ArticleDraftController.java` | `articles`<br>`article_versions`<br>`tags` |
| **UC068, UC069** | **Paywall Server-side Engine** (II.5.5) | Nằm ở tầng Server (gọi qua `/articles/:slug`) | `PaywallPrompt.tsx` | `GET /api/v1/delivery/articles/{slug}` | `PaywallEngine.java` | `articles`<br>`subscriptions`<br>`article_purchases` |
| **UC070, UC071** | **Cấu hình Slot & Phân phối Banner** | Phân phối ngẫu nhiên trên trang đọc báo | `PublicLayout.tsx` | `GET /api/v1/delivery/ad-slots/{slotCode}/serve` | `AdDeliveryController.java` | `ad_slots`<br>`ad_creatives` |
| **UC074** | **Nhật ký Kiểm toán (Audit Logs)** (II.5.10) | `/backoffice/admin` $\rightarrow$ Audit Logs | `AuditLogsPage.tsx` | `GET /api/v1/admin/audit-logs` | `AdminAuditLogController.java` | `audit_logs` |

---

## 2. TRÌNH TỰ ĐIỀU HƯỚNG & KỊCH BẢN THAO TÁC (LUỒNG NGHIỆP VỤ)

### 2.1. Kịch bản Iter 1 (SV4): Webhook bị lỡ -> Khách khiếu nại -> Kế toán đối chiếu sao kê -> Ghi nhận -> Sổ quỹ -> Hóa đơn
*Swimlane:* `swimlane_sv4_03_complaint.png` | *UC:* UC051 (include UC049), UC058, UC057 | *Màn hình:* II.4.2 Hàng chờ khiếu nại, II.4.1

> Không còn "kế toán duyệt chuyển khoản thủ công": `ManualBankTransferController/Service` đã xóa, `/manual-transfers/*` trả 404, nút "Duyệt PAID" đã gỡ. Mọi tiền vào chỉ qua webhook SePay hoặc ví; khiếu nại là đường cứu khi webhook bị lỡ.

**Bước đầu tiên: khách tạo đơn.**
1. Tab 1 (khách): đăng nhập `reader.an@gmail.com` / `password`, mở bài Premium `/articles/khai-thac-tiem-nang-cang-nuoc-sau-lach-huyen` (15.000 ₫), bấm **Mua bài**.
   - SV3 gọi `POST /api/v1/finance/orders` (UC047) -> transaction `PENDING` + `orderCode` -> navigate `/payment/:orderCode`.
2. Chọn **QR SePay**, khách chuyển khoản (demo: coi như đã chuyển nhưng **không** bấm "Chuyển đủ tiền" — giả lập webhook bị lỡ). Đơn vẫn `PENDING`, chưa đọc được bài (Rule 4).
3. Bấm link **"Đã chuyển hơn 15 phút mà chưa được ghi nhận? Gửi khiếu nại"** (có trên `/payment/:orderCode` và `/wallet`) -> `/wallet/complaints` (`PaymentComplaintPage.tsx`).
4. Điền form: mã đơn (không bắt buộc), số tiền 15.000, thời gian chuyển, **mã giao dịch ngân hàng** (bắt buộc, vd `FT26293001`), ghi chú -> `POST /api/v1/finance/complaints` -> khiếu nại `OPEN`, hiện ở "Khiếu nại của tôi" (`GET /complaints/me`).
   - Gửi lại cùng mã GD -> `409` (`UNIQUE bank_reference`). Nhập mã đơn của người khác -> `403` (Rule 14).
5. Tab 2 (kế toán): đăng nhập `ketoan@localpress.vn` / `password` -> tự vào `/backoffice/finance` (qua `getDefaultBackofficeRoute`).
6. Menu **Khiếu nại thanh toán** -> `/backoffice/finance/complaints` (`ComplaintQueuePage.tsx`, `GET /complaints?status=OPEN`).
7. Đối chiếu sao kê ngân hàng theo **mã GD + số tiền**.
8. Bấm **Ghi nhận vào đơn** -> ConfirmDialog "Đã khớp sao kê, ghi nhận" -> `POST /complaints/{id}/resolve?target=ORDER`.
   - Backend gọi CHÍNH `PaymentProcessingService.processSepayIpn` với mã GD của khách -> đơn `SUCCESS`, `PaymentSuccessEvent` -> SV3 mở khóa. Khiếu nại `RESOLVED`.
   - Bấm lại trên khiếu nại đã đóng -> `409`. Webhook thật về sau với cùng mã GD -> `ALREADY_PROCESSED`.
9. Mở `/backoffice/finance/ledger` (`GeneralLedgerPage.tsx`): dòng Credit mới; 3 KPI Credit, Debit, Net = Credit - Debit.
10. Mở đơn ở `/backoffice/finance/orders/:id` -> **In chứng từ / hóa đơn** (UC057). Tab 1 reload bài: đọc được toàn văn.
11. Demo thêm **Từ chối**: khách gửi khiếu nại với mã GD không có trên sao kê -> kế toán bấm **Từ chối**, để trống lý do -> `400`; nhập lý do -> `POST /complaints/{id}/reject` -> `REJECTED`, khách thấy lý do ở "Khiếu nại của tôi".
12. (Tùy chọn) **Cộng vào ví**: khiếu nại không có mã đơn -> `resolve?target=WALLET` -> TOPUP `CMP-{mãGD}`, số dư ví tăng. Thử cộng ví cho đơn còn `PENDING` chưa hết hạn -> `409` (bắt ghi nhận vào đơn).

---

### 2.2. Kịch bản Iter 2 (SV4): Trang thanh toán chung -> QR SePay -> Webhook -> Ví -> Công nợ B2B
*Swimlane:* `swimlane_sv4_01_payment.png`, `swimlane_sv4_02_wallet_topup.png`, `swimlane_sv4_04_reconciliation.png` | *UC:* UC047 - UC050, UC053 | *Màn hình:* II.4.3, II.4.4

**Bước đầu tiên: Guest mở bài Premium.**
1. Tab ẩn danh (Guest): mở `/articles/tham-nhap-duong-day-buon-lau-qua-duong-bien-bach-long-vi` -> chỉ thấy preview 30% (Rule 3).
2. Bấm **Mua bài (25.000 ₫)** -> được yêu cầu đăng nhập (`reader.mai@gmail.com`) -> SV3 gọi `POST /api/v1/finance/orders` (UC047) -> navigate `/payment/:orderCode`.
3. Trang thanh toán (`PaymentPage.tsx`) chỉ cho thầy: số tiền, mô tả đơn, 2 phương thức **Ví LocalPress** và **QR SePay**.
4. Chọn **QR SePay**: ảnh `qrCodeUrl`, nội dung CK = `orderCode`, đếm ngược 15 phút từ `expiresAt`.
   - F12 tab Network: polling `GET /api/v1/finance/orders/code/{code}/status` mỗi 3s (UC050).
   - Bấm **Tôi đã chuyển khoản**: chỉ gọi kiểm tra lại, đơn vẫn `PENDING` (Rule 4).
5. Quét QR chuyển tiền thật, hoặc (profile dev) bấm nút **"Chuyển đủ tiền"** trên trang thanh toán -> `POST /api/v1/finance/orders/code/{code}/simulate-ipn` (giả lập IPN SePay, đi đúng đường xử lý webhook).
6. Backend (UC049 -> UC048): verify khóa, tìm đơn, so tiền -> `SUCCESS` -> `PaymentSuccessEvent` -> SV3 mở khóa. Trang thanh toán tự chuyển thành công, bài đọc được toàn văn.
7. Ở màn hình thành công bấm **"Bắn lại webhook (cùng mã giao dịch)"** -> response `ALREADY_PROCESSED`, sổ quỹ không thêm dòng, ví không cộng (Rule 5).
8. Bắn IPN với khóa sai (Postman/curl tới `POST /api/v1/finance/webhook/sepay`) -> HTTP `401 INVALID_SIGNATURE`, ghi log AUDIT.
8b. Đơn khác bấm **"Chuyển thiếu 50%"** -> `UNDERPAID_CREDITED_TO_WALLET`: số đã nhận vào ví (TOPUP con `{orderCode}-PART-{ref}`), đơn vẫn `PENDING`; khách bù bằng ví ở bước 10.
9. **Nạp ví từ header:** bấm `WalletBalanceButton` -> **Nạp tiền** -> `/wallet/topup` -> chọn 50.000 ₫ (thử nhập 5.000 ₫ để thấy lỗi validate 10.000 - 50.000.000) -> `POST /api/v1/finance/wallet/topups` -> `/payment/:orderCode` (chỉ QR) -> IPN -> số dư header tăng.
   - Chỉ `/backoffice/finance` cho thầy: TOPUP không cộng vào doanh thu (công nợ phải trả khách).
10. **Trả đơn bằng ví:** mua bài Premium thứ 2 -> `/payment/:orderCode` chọn **Ví LocalPress** -> `POST /orders/code/{code}/pay-with-wallet` -> `SUCCESS` ngay, `payment_method = WALLET`. Thử với số dư thiếu -> hiện nút **Nạp thêm**.
11. **Công nợ phải thu B2B (UC053):** đăng nhập `adv.canghaiphong@gmail.com`, đặt booking (luồng SV1 mục 2.4) -> đơn `AD` ra `/payment/:orderCode`. Kế toán mở `/backoffice/finance/orders?type=AD` / `GET /api/v1/finance/receivables`: booking chưa trả, hạn thanh toán, gửi nhắc nợ.

---

### 2.3. Kịch bản Iter 3 (SV4): Tiền lệch/muộn -> Đối soát -> Hoàn tiền 4 mắt -> Dashboard -> Báo cáo -> Cảnh báo
*Swimlane:* mục 01 (nhánh lỗi), 04, 05, 06 | *UC:* UC054, UC055, UC056, UC052, UC059, UC060 | *Màn hình:* II.4.5 - II.4.8

**Bước đầu tiên: tiền về lệch hoặc muộn.**
1. Doanh nghiệp tạo booking quảng cáo (đơn `AD`), để quá 15 phút giữ chỗ (hoặc sửa `expires_at` trong DB), rồi giả lập IPN -> `LATE_PAYMENT_CREDITED_TO_WALLET`: toàn bộ tiền vào ví (TOPUP con `{orderCode}-LATE`), không kích hoạt slot, thông báo đặt lại (Rule 6). Tương tự với đơn đã `FAILED`/`REFUNDED`.
   - Đối chiếu: đơn ARTICLE/SUBSCRIPTION về muộn vẫn cấp quyền bình thường (bài/gói không giới hạn số lượng). Nạp ví về muộn sau hạn QR vẫn cộng ví.
   - Chuyển thừa: đơn `SUCCESS`, phần dư vào ví (`{orderCode}-EXCESS`).
2. Bắn IPN với `orderCode` không tồn tại -> `ORDER_NOT_FOUND`; dòng này kế toán xử lý bằng sao kê ở bước 3.
3. Kế toán mở `/backoffice/finance/reconciliation` (`ReconciliationPage.tsx`, UC054): tổng tiền hệ thống = giao dịch `SUCCESS`, loại `REFUND`, bỏ `payment_method = WALLET` (TOPUP nạp qua QR vẫn tính), so với tổng sao kê. Xử lý dòng lệch **Gán đơn** / **Cộng ví** / **Hoàn** -> `POST /reconciliation/resolve` (ghi `audit_logs`) -> người duyệt `POST /reconciliation/close` chốt kỳ.
4. **Hoàn tiền 4 mắt (UC055):** kế toán `ketoan@localpress.vn` mở `/backoffice/finance/refunds`, chọn giao dịch `SUCCESS`, đề xuất hoàn -> `POST /refunds/propose`.
   - Thử đề xuất vượt số tiền thực thu (cộng cả đề xuất đang `PENDING`) -> bị chặn (Rule 11).
5. **Thử cùng người duyệt:** vẫn tài khoản `ketoan` bấm Duyệt -> `403` "Vi phạm nguyên tắc 4 mắt".
6. Đăng nhập `admin@localpress.vn` (Finance Manager, mắt 2) -> Duyệt -> refund `COMPLETED`, giao dịch `REFUND` mới, gốc `REFUNDED`; SV4 phát `RefundCompletedEvent`, listener của SV3 thu hồi quyền đọc (UC056, Rule 17: SV4 không tự sửa bảng `article_purchases`). Tab khách reload: bài quay lại preview 30% (chỉ khi SV3 đã viết listener).
7. `/backoffice/finance/ledger`: dòng Debit, Net giảm đúng số hoàn.
8. **Dashboard (UC052):** `/backoffice/finance` — thu B2B / B2C, hoàn, nạp ví tách riêng.
9. **Xuất báo cáo (UC059):** `GET /api/v1/finance/reports/export` -> file CSV; số liệu khớp Dashboard (Rule 16).
10. **Cảnh báo (UC060):** `GET /api/v1/finance/alerts` -> `REFUND_PENDING` (refund chờ mắt 2), `DEBT_OVERDUE` (công nợ AD quá hạn); mỗi cảnh báo có `actionUrl` mở đúng màn hình xử lý. Webhook sai khóa (bước 8 Iter 2) tra trong log AUDIT.

---

### 2.4. Luồng 3 (SV1 & SV4 Liên thông): Doanh nghiệp đặt vị trí & Thanh toán
1. Đăng nhập Doanh nghiệp: `adv.canghaiphong@gmail.com` / `password` $\rightarrow$ Vào `/advertiser/slots`.
2. Doanh nghiệp xem thông số vị trí: Kích thước tiêu chuẩn (1140x120, 728x90, 300x600), Đơn giá/ngày.
3. Bấm **Đặt vị trí này** $\rightarrow$ Sang `/advertiser/bookings/new` $\rightarrow$ Chọn ngày bắt đầu, ngày kết thúc.
4. Hệ thống tính tổng tiền $\rightarrow$ Tạo đơn $\rightarrow$ Chuyển sang thanh toán (`/advertiser/billing` gọi API `POST /api/v1/finance/orders` của SV4).
5. (Phần SV4) Đơn `AD` được chuyển tới trang thanh toán chung `/payment/:orderCode` (Ví hoặc QR SePay); chưa trả đủ thì nằm ở công nợ phải thu B2B (UC053).

---
### 2.5. Luồng 4 (SV3 & SV5 Liên thông): Đọc báo Free vs Paywall Premium
1. Không đăng nhập (Mở Tab Ẩn danh Guest):
   - Mở `/`: Đọc danh sách tin địa phương Hải Phòng.
   - Mở `/articles/hai-phong-thu-hut-hon-2-8-ty-usd-von-fdi` $\rightarrow$ Bài FREE đọc 100% nội dung bình thường, không bắt đăng nhập (Quy tắc 1).
2. Mở bài điều tra chuyên sâu:
   - Mở `/articles/tham-nhap-duong-day-buon-lau-qua-duong-bien-bach-long-vi` (Bài PREMIUM - 25.000 ₫).
   - Giao diện bị cắt đúng **30% nội dung (Paywall Preview)**.
   - Bấm F12 Inspect HTML $\rightarrow$ Không thấy phần còn lại trong mã nguồn (Tuân thủ Quy tắc 3: Server-side Paywall).
   - Nút hành động hiển thị: "Mua lẻ bài viết (25.000 ₫)" hoặc "Đăng ký Gói Hội Viên".

---

## 3. CẨM NANG SỬA LOGIC (NẾU THẦY BẢO SỬA THÌ SỬA Ở ĐÂU?)

Đây là phần "sống còn" khi thầy chỉ định live-coding kiểm tra xem có nắm code hay không.

### 3.1. Nhóm 1: Sửa Validate & Ràng buộc dữ liệu (Validation Rules)

#### Tình huống 1: Thầy yêu cầu: *"Bắt buộc mã giao dịch ngân hàng trong khiếu nại phải có tối thiểu 6 ký tự và không được để trống"*
- **Sửa ở đâu:** Mở file DTO Backend:
  `backend/src/main/java/com/localpress/finance/dto/request/CreateComplaintRequest.java`
- **Cách sửa:**
  ```java
  @NotBlank(message = "Vui lòng nhập mã giao dịch trên biên lai ngân hàng") // đã có
  @Size(min = 6, max = 100, message = "Mã giao dịch ngân hàng phải có tối thiểu 6 ký tự")
  private String bankReference;
  ```
- **Giải thích với thầy:** DTO tiếp nhận request. `PaymentComplaintController.create` đã gắn `@Valid`, vi phạm sẽ trả `400 Bad Request` qua `FinanceExceptionHandler`. Phía FE thêm `.min(6, '...')` vào zod schema của `PaymentComplaintPage.tsx` để báo lỗi tiếng Việt ngay trên form.

---

#### Tình huống 2: Thầy yêu cầu: *"Chặn không cho nhập số tiền âm hoặc bằng 0 khi tạo giao dịch"*
- **Sửa ở đâu:**
  - File Backend: `backend/src/main/java/com/localpress/finance/model/Transaction.java` hoặc DTO tạo đơn.
- **Cách sửa:**
  Thêm annotation `@DecimalMin(value = "1000.00", message = "Số tiền tối thiểu là 1.000 VNĐ")` trên trường `amount` (khiếu nại đã có sẵn ở `CreateComplaintRequest.amount`).

---

### 3.2. Nhóm 2: Sửa Quy tắc Nghiệp vụ & State Machine (Business Logic)

#### Tình huống 3: Thầy yêu cầu: *"Khi Kế toán từ chối khiếu nại, bắt buộc phải có lý do và lưu vào Database"*
- **Đã có sẵn, chỉ cần chỉ code:** `backend/src/main/java/com/localpress/finance/model/PaymentComplaint.java`, hàm domain `reject`:
  ```java
  public void reject(Long accountantId, String reason) {
      assertOpen();                                   // đã đóng -> 409
      if (reason == null || reason.isBlank()) {
          throw new AppException("Phải nhập lý do từ chối để thông báo cho khách", HttpStatus.BAD_REQUEST);
      }
      this.status = Status.REJECTED;
      this.resolutionNote = reason.trim();            // lưu cột resolution_note
      this.resolvedBy = accountantId;
      this.resolvedAt = LocalDateTime.now();
  }
  ```
- **Nếu thầy bảo "lý do tối thiểu 10 ký tự":** thêm `|| reason.trim().length() < 10` vào điều kiện trên. Kiểm tra đặt trong entity nên mọi đường gọi (controller, test, job) đều bị chặn, không chỉ form FE.

---

#### Tình huống 4: Thầy yêu cầu: *"Kế toán không được tự xử lý khiếu nại của chính mình"*
- **Sửa ở đâu:** `PaymentComplaintService.java`, đầu hàm `resolve` và `reject` (sau khi `findByIdForUpdate`):
  ```java
  if (c.getUserId().equals(accountantId)) {
      throw new AppException("Kế toán không được tự xử lý khiếu nại của chính mình (Quy tắc 4 mắt)", HttpStatus.FORBIDDEN);
  }
  ```
- **Liên hệ:** hoàn tiền đã áp dụng đúng nguyên tắc này ở `RefundManagementService.reviewRefund` (`proposedBy == reviewer` -> 403).

---

#### Tình huống 5: Thầy yêu cầu: *"Chống ghi nhận trùng (Idempotency) khi khách khiếu nại một mã giao dịch đã được ghi nhận"*
- **Đã có 3 lớp, chỉ cho thầy:**
  1. `PaymentComplaintService.create`: mã GD đã khiếu nại -> `409`; DB có `UNIQUE (bank_reference)` ở `payment_complaints` (migration `V4__payment_complaints.sql`).
  2. `resolve(target=ORDER)` gọi chính `processSepayIpn`: đơn đã `SUCCESS` -> `ALREADY_PROCESSED` -> service đổi thành `409` gợi ý cộng ví.
  3. `resolve(target=WALLET)`: đơn còn `PENDING` chưa hết hạn -> `409` (bắt ghi nhận vào đơn, tránh webhook thật về sau ghi lần 2). TOPUP mã `CMP-{mãGD}` cộng ví qua `wallet_entries` có `UNIQUE(transaction_id, direction)`.
- `findByIdForUpdate` khóa `PESSIMISTIC_WRITE` dòng khiếu nại: 2 kế toán bấm cùng lúc thì người thứ hai thấy đã đóng -> `409`.

---

### 3.3. Nhóm 3: Sửa Bộ lọc & Truy vấn Dữ liệu (Query & Filtering)

#### Tình huống 6: Thầy yêu cầu: *"Thêm bộ lọc tìm kiếm theo khoảng số tiền (minAmount và maxAmount) trong Sổ quỹ"*
- **Bước 1: Sửa DTO Request** `backend/src/main/java/com/localpress/finance/dto/request/LedgerFilterRequest.java`:
  ```java
  private BigDecimal minAmount;
  private BigDecimal maxAmount;
  ```
- **Bước 2: Sửa Query JPA Repository** `backend/src/main/java/com/localpress/finance/repository/TransactionRepository.java`:
  Bổ sung vào câu `@Query("..."):`
  ```sql
  AND (:minAmount IS NULL OR t.amount >= :minAmount)
  AND (:maxAmount IS NULL OR t.amount <= :maxAmount)
  ```
- **Bước 3: Truyền tham số trong Service** `FinanceLedgerService.java`:
  Truyền `filter.getMinAmount()`, `filter.getMaxAmount()` vào `transactionRepository.searchLedger(...)`.

---

### 3.4. Nhóm 4: Sửa Giao diện Frontend (UI Display & Calculations)

#### Tình huống 7: Thầy yêu cầu: *"Đổi cách hiển thị tiền tệ hoặc ngày giờ"*
- **Sửa ở đâu:** Không format thủ công trong từng thẻ HTML, mở file format dùng chung:
  `frontend/src/lib/format/index.ts`
- **Các hàm chuẩn:**
  + `formatCurrency(val)`: Chuyển `15000` $\rightarrow$ `15.000 ₫`.
  + `formatDateTime(val)`: Chuyển ISO string $\rightarrow$ `DD/MM/YYYY HH:mm` (múi giờ Việt Nam).

#### Tình huống 8: Thầy yêu cầu: *"Đổi màu badge trạng thái giao dịch"*
- **Sửa ở đâu:** Mở `frontend/src/components/shared/StatusBadge.tsx`:
  Tìm nhánh `type === 'payment'`:
  - `PAID` / `SUCCESS` $\rightarrow$ `bg-emerald-100 text-emerald-800`
  - `PROCESSING` / `PENDING` $\rightarrow$ `bg-amber-100 text-amber-800`
  - `FAILED` $\rightarrow$ `bg-red-100 text-red-800`

---

## 4. CHECKLIST PHÒNG THI DÀNH CHO SV4 (TRƯỚC KHI BƯỚC VÀO REVIEW)

- [ ] **Môi trường Database:** Đã chạy script `seed_data.sql` vào MySQL database `localpress_db`.
- [ ] **Môi trường Backend:** Chạy `mvn spring-boot:run` (cổng `8080`), kiểm tra console không báo lỗi Bean trùng lặp.
- [ ] **Môi trường Frontend:** Chạy `npm run dev` (cổng `5173`).
- [ ] **Tab Trình duyệt 1 (Kế toán SV4):** Mở sẵn `/backoffice/finance/complaints`, `/backoffice/finance/orders` và `/backoffice/finance/ledger` (đã đăng nhập `ketoan@localpress.vn`).
- [ ] **Tab Trình duyệt 2 (Khách Guest SV3):** Mở cửa sổ ẩn danh sẵn trang chủ `/` và bài điều tra Premium.
- [ ] **IDE VSCode mở sẵn các file quan trọng:**
  1. `backend/.../finance/controller/PaymentComplaintController.java`
  2. `backend/.../finance/service/PaymentComplaintService.java`, `model/PaymentComplaint.java` (`reject` bắt buộc lý do)
  3. `backend/.../finance/model/Transaction.java`
  4. `frontend/src/features/finance/pages/ComplaintQueuePage.tsx`, `PaymentComplaintPage.tsx`, `OrderDetailPage.tsx` (in hóa đơn)
  5. `frontend/src/features/finance/pages/GeneralLedgerPage.tsx`
  6. `frontend/src/features/finance/pages/PaymentPage.tsx`
  7. `backend/.../finance/service/PaymentProcessingService.java` (`processSepayIpn`, pay-with-wallet)
  8. `backend/.../finance/service/WalletService.java`, `repository/WalletRepository.java` (`@Lock PESSIMISTIC_WRITE`)
  9. `backend/src/main/resources/db/migration/V3__wallet_and_topup.sql` (`UNIQUE(transaction_id, direction)`, `CHECK balance >= 0`), `V4__payment_complaints.sql` (`UNIQUE bank_reference`)
- [ ] **Postman/curl:** chuẩn bị sẵn request IPN `POST /api/v1/finance/webhook/sepay` (khóa đúng, khóa sai, bắn lại lần 2, orderCode không tồn tại, lệch tiền).
- [ ] **Tab Trình duyệt 3 (Mắt 2):** đăng nhập `admin@localpress.vn` để duyệt hoàn tiền 4 mắt.

---

## 5. CHIẾN THUẬT "GÀI BẪY CÓ CHỦ ĐÍCH" KHI REVIEW (HONEYPOT BAITING TACTICS)

### 5.1. Bản chất chiến thuật
Giảng viên review chuyên môn rất thích phát hiện thiếu sót hoặc đặt câu hỏi dồn ép sinh viên. Nếu ta trình bày quá hoàn hảo không có tì vết, giảng viên sẽ đi tìm những câu hỏi bất ngờ ngoài dự kiến.  
**Chiến thuật Honeypot (Thả mồi bắt bóng):** Chủ động hé lộ một điểm nghi vấn trông có vẻ "ngây thơ" hoặc "thiếu sót cơ bản" trong lúc thuyết trình. Khi giảng viên chộp lấy điểm này để vặn hỏi, ta lập tức tung ra câu trả lời chiều sâu về mặt kiến trúc phần mềm, bảo mật hoặc nguyên tắc kiểm soát tài chính. Lúc này câu hỏi khó biến thành "đất diễn" giúp sinh viên đạt điểm xuất sắc.

---

### 5.2. 7 Kịch bản Gài bẫy kinh điển dành cho SV4 (Huy - Kế toán & Dòng tiền)

#### Bẫy 1: Thả câu hỏi về "Tại sao không cho kế toán tự bấm PAID cho nhanh?"
* **Cách gài trong lúc nói:**  
  Khi mở `/backoffice/finance/complaints`, nói lướt: *"Màn hình này kế toán không có nút đổi đơn sang PAID, chỉ có Ghi nhận vào đơn, Cộng vào ví, Từ chối..."*
* **Giảng viên sẽ vặn:**  
  *"Kế toán đã nhìn thấy tiền trên sao kê rồi thì cho bấm PAID luôn, sao phải vòng qua khiếu nại?"*
* **Câu trả lời:**  
  *"Dạ đây là quyết định có chủ đích. Nút PAID tay là một đường ghi nhận tiền thứ hai, song song với webhook, nên phải tự lặp lại toàn bộ logic: so số tiền, chuyển thiếu, chuyển thừa, tiền về muộn của booking quảng cáo, chống trùng. Chỉ cần lệch một nhánh là cấp quyền sai hoặc cộng tiền 2 lần.  
  Bọn em cho **mọi ghi nhận vào đơn đi qua cùng một hàm idempotent với webhook**: nút Ghi nhận vào đơn gọi chính `processSepayIpn` với mã giao dịch của khách. Vì vậy:
  1. Thiếu tiền thì vào ví và đơn giữ PENDING, thừa thì phần dư vào ví, đơn AD quá hạn thì vào ví — giống hệt IPN thật.
  2. Webhook thật về sau với cùng mã GD trả `ALREADY_PROCESSED`, không ghi lần 2 (Rule 5).
  3. Kế toán chỉ quyết định 'khớp sao kê hay không', không quyết định trạng thái đơn (Rule 4)."*

---

#### Bẫy 2: Thả câu hỏi về "Khách nhập mã giao dịch bừa thì sao? Sao không OCR biên lai?"
* **Cách gài trong lúc nói:**  
  Ở form `/wallet/complaints`: *"Khách chỉ cần gõ mã giao dịch trên biên lai, không cần upload ảnh..."*
* **Giảng viên sẽ vặn:**  
  *"Thế khách bịa mã, hoặc lấy mã của giao dịch cũ thì sao? Sao không cho upload ảnh rồi OCR duyệt tự động?"*
* **Câu trả lời:**  
  *"Dạ mã khách nhập chỉ là **manh mối để tra sao kê**, không phải bằng chứng. Ảnh biên lai làm giả được, OCR chỉ đọc đúng cái ảnh giả đó. Bằng chứng duy nhất là sao kê tài khoản tòa soạn, nên khiếu nại luôn qua kế toán đối chiếu:
  1. Mã bịa -> không có trên sao kê -> Từ chối, lý do bắt buộc (`PaymentComplaint.reject`, trống -> 400).
  2. Mã cũ đã khiếu nại -> `409` do `UNIQUE (bank_reference)`. Mã đã được webhook ghi nhận -> Ghi nhận vào đơn trả `ALREADY_PROCESSED` -> `409`.
  3. Mã đơn của người khác -> `403`, chống IDOR (Rule 14)."*

---

#### Bẫy 3: Thả câu hỏi về ORM: "Tại sao trong Entity Transaction không dùng `@ManyToOne User user`?"
* **Cách gài trong lúc nói:**  
  Khi mở file `Transaction.java`, dừng lại ở các trường ID và nói:  
  *"Trong bảng transactions, em lưu `private Long userId;`, `private Long subscriptionId;`, `private Long campaignId;`..."*
* **Giảng viên sẽ vặn:**  
  *"Lập trình Spring Data JPA sao em không dùng quan hệ đối tượng `@ManyToOne private User user;` để dùng lazy load hay cascade, sao lại đi lưu ID kiểu số nguyên `Long` như thời viết JDBC thuần thế?"*
* **Câu trả lời lật kèo "ăn điểm tuyệt đối":**  
  *"Dạ thưa thầy, em hoàn toàn nắm vững cách dùng `@ManyToOne` và `@JoinColumn`. Nhưng việc em cố ý dùng **Scalar Foreign Key (`Long userId`)** là áp dụng nguyên lý **Bounded Context của kiến trúc Domain-Driven Design (DDD)** và quản trị ranh giới code trong nhóm:
  1. **Tránh phụ thuộc chéo (Loose Coupling) giữa các thành viên:** Entity `User` do SV5 quản lý, `AdCampaign` do SV1 quản lý. Nếu em `@ManyToOne` trỏ chặt vào các entity đó, mỗi khi SV1 hoặc SV5 sửa cấu trúc bảng của các bạn, build của module Tài chính sẽ bị vỡ hoặc sinh conflict Git liên tục.
  2. **Tối ưu hiệu năng truy vấn tài chính:** Bảng giao dịch tài chính về sau có hàng trăm nghìn bản ghi. Việc dùng Scalar Foreign Key ngăn chặn hoàn toàn nguy cơ phát sinh Hibernate N+1 Query và cascade cập nhật ngoài ý muốn.
  3. Khi cần thông tin hiển thị, em truy vấn độc lập hoặc dùng Domain Event để trao đổi dữ liệu."*

---

#### Bẫy 4: Thả câu hỏi về Liên thông: "Bấm duyệt ở đây rồi quyền lợi của khách được kích hoạt ở đâu?"
* **Cách gài trong lúc nói:**  
  Khi giải thích code service, nói:  
  *"Sau khi lưu đơn thành công, hàm này kết thúc và trả về Response cho Frontend..."* (Cố ý không nói to về Event Listener).
* **Giảng viên sẽ vặn:**  
  *"Ủa webhook ghi nhận SUCCESS xong rồi thì độc giả được mở khóa bài viết kiểu gì? Doanh nghiệp được chạy banner quảng cáo kiểu gì? Trong file service của em có thấy gọi sang bên Quảng cáo hay Độc giả đâu?"*
* **Câu trả lời lật kèo "ăn điểm tuyệt đối":**  
  *(Mỉm cười tự tin, chỉ chuột vào dòng `eventPublisher.publishEvent(new PaymentSuccessEvent(...))`):*  
  *"Dạ thưa thầy, em không gọi trực tiếp service của SV1 hay SV3 vì làm như thế sẽ vi phạm nguyên tắc **Code Ownership** và tạo ra **Circular Dependency**.
  Em áp dụng mô hình **Decoupled Domain Events**:
  - Phân hệ Tài chính của em chỉ làm đúng chức năng kế toán: xác minh dòng tiền và ghi sổ. Sau khi xong, em phát tán sự kiện `PaymentSuccessEvent`.
  - Bên module Reader (SV3) và Advertising (SV1) sẽ có các `@EventListener` độc lập lắng nghe sự kiện này. Khi nhận được event, họ sẽ tự mở khóa bài viết hoặc đổi trạng thái chiến dịch.
  - Nhờ vậy, nếu module Quảng cáo có lỗi hoặc đang bảo trì, hệ thống thanh toán của em vẫn chạy trơn tru mà không bị crash theo!"*
* **Lưu ý trung thực (đọc trước khi dùng bẫy này):** tính tới 20/10/2026, SV1/SV3 **chưa viết** `@EventListener PaymentSuccessEvent`. Chỉ dùng bẫy này khi listener đã có trong code. Nếu chưa có mà giảng viên hỏi, trả lời thẳng: "Phía em đã phát event và chốt hợp đồng trong AGENTS.md mục 5; phần lắng nghe là trách nhiệm của module SV1/SV3 theo Rule 17, em đã gửi yêu cầu cho anh Hoàng và Tây." Không nói là đã có khi chưa có.

---

#### Bẫy 5: Thả câu hỏi về "Hai tab cùng trả bằng ví thì có bị trừ âm không?"
* **Cách gài trong lúc nói:**  
  Khi demo trả bằng ví ở `/payment/:orderCode`, nói lướt: *"Hàm này đọc số dư, thấy đủ thì trừ rồi lưu lại..."*
* **Giảng viên sẽ vặn:**  
  *"Nếu khách mở 2 tab, bấm trả 2 đơn cùng lúc, cả 2 request cùng đọc số dư 50.000 rồi cùng trừ 30.000 thì sao?"*
* **Câu trả lời:**  
  *"Dạ, `WalletRepository` có hàm đọc ví với `@Lock(LockModeType.PESSIMISTIC_WRITE)` (MySQL `SELECT ... FOR UPDATE`). Request thứ 2 phải chờ request thứ nhất commit, lúc đó đọc lại số dư 20.000 và bị từ chối thiếu tiền. Thêm lớp chặn cuối ở DB: `CHECK (balance >= 0)` trên bảng `wallets`. Em chọn pessimistic thay vì optimistic vì đây là tiền, xung đột phải chờ chứ không retry."*
* **Live-coding nếu thầy bảo bỏ lock để xem lỗi:** mở `WalletRepository.java`, comment dòng `@Lock(...)`, chạy 2 request song song bằng Postman Runner -> thấy số dư sai hoặc DB ném lỗi CHECK; bật lại lock -> request 2 nhận lỗi thiếu số dư.

---

#### Bẫy 6: Thả câu hỏi về "Nạp ví 500.000 thì doanh thu tăng 500.000 à?"
* **Cách gài trong lúc nói:**  
  Sau khi nạp ví thành công, mở Dashboard và nói: *"Tiền đã vào tài khoản tòa soạn rồi ạ..."* (cố ý không nói về doanh thu).
* **Giảng viên sẽ vặn:**  
  *"Vậy doanh thu tháng này tăng thêm 500.000 đúng không?"*
* **Câu trả lời:**  
  *"Dạ không. Nạp ví là **công nợ phải trả khách** — tòa soạn đang giữ tiền hộ, khách có quyền tiêu hoặc yêu cầu hoàn. Doanh thu chỉ ghi nhận khi khách tiêu ví mua bài/gói/booking (`payment_method = WALLET`) hoặc trả QR trực tiếp. Vì vậy `transaction_type = TOPUP` không gắn subscription/purchase/campaign (CHECK constraint V3) và bị loại khỏi công thức doanh thu ở Dashboard lẫn file xuất, đảm bảo Rule 16 số liệu khớp nhau."*
* **Live-coding:** thầy bảo hiển thị riêng "Số dư ví khách đang giữ" trên Dashboard -> thêm 1 query `SUM(balance) FROM wallets` trong service Dashboard, trả thêm 1 field, FE thêm 1 card `formatCurrency`.

---

#### Bẫy 7: Thả câu hỏi về "SePay bắn webhook 2 lần thì ví có cộng 2 lần không?"
* **Cách gài trong lúc nói:**  
  Khi bắn lại IPN và thấy `ALREADY_PROCESSED`, nói: *"Ở đây em check trạng thái đơn đã SUCCESS thì bỏ qua..."*
* **Giảng viên sẽ vặn:**  
  *"Nếu 2 webhook đến cùng 1 mili-giây, cả 2 cùng thấy đơn đang PENDING thì check trạng thái có cứu được không?"*
* **Câu trả lời:**  
  *"Dạ check trạng thái chỉ là lớp 1. Lớp 2 ở DB: `wallet_entries` có `UNIQUE (transaction_id, direction)` — mỗi giao dịch chỉ có tối đa 1 dòng CREDIT và 1 dòng DEBIT. Request thứ 2 insert trùng sẽ bị DB ném lỗi, transaction rollback, ví không cộng lần 2. Cộng với khóa ví pessimistic, 2 request không thể cùng sửa số dư. Đây là Rule 5: idempotent phải đứng được cả khi race condition, không chỉ dựa vào if ở code."*
* **Live-coding:** thầy bảo chứng minh -> chạy SQL insert tay 1 dòng `wallet_entries` trùng `transaction_id` + `direction` -> thấy lỗi `Duplicate entry ... uk_wallet_entries_tx_direction`.

---

## 6. KHUNG REVIEW MÀN HÌNH TOÀN DIỆN (FULL-SCREEN ARCHITECTURAL REVIEW FRAMEWORK)
### *Case Study Mẫu: Màn hình Quản lý Đơn hàng (`/backoffice/finance/orders`) & Hàng chờ khiếu nại (`/backoffice/finance/complaints`)*

Khi giảng viên chỉ vào một màn hình bất kỳ trên trình duyệt và hỏi:  
*"Em hãy giải thích cấu trúc toàn bộ màn hình này: Layout khung ở đâu? Các phần trên màn hình nằm ở file nào? Bấm vào từng nút thì code chạy từ đâu tới đâu?"*  
$\rightarrow$ Sinh viên trình bày theo đúng **3 lớp kiến trúc** sau:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. KHUNG LAYOUT NGOÀI CÙNG (BackofficeLayout.tsx)                            │
│    - Header trên cùng (Logo, Badge SV4, Profile, Đăng xuất)                 │
│    - Sidebar bên trái (Menu Tài chính SV4 active: /backoffice/finance/orders)│
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. NỘI DUNG MÀN HÌNH CHÍNH (OrderListPage.tsx qua <Outlet />)                │
│    - Header Bar: Tiêu đề + Nút refresh                                      │
│    - Filter Bar: Ô tìm kiếm (search) + Lọc Dịch vụ + Lọc Trạng thái        │
│    - Data Grid: Danh sách đơn hàng + StatusBadge + Cột Hành động            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. TRACE CODE HÀNH ĐỘNG KHI CLICK TỪNG NÚT CỤ THỂ                            │
│    - Click "Chi tiết / Xác minh ngay" -> Chạy sang OrderDetailPage.tsx      │
│    - Click "Ghi nhận vào đơn" (Hàng chờ khiếu nại) -> resolve UC051         │
│    - Click "In chứng từ / Hóa đơn" -> Bật Modal Hóa đơn điện tử UC057       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.1. Lớp 1: Khung Layout bao bọc bên ngoài (Layout Breakdown)
* **File quản lý:** `frontend/src/layouts/BackofficeLayout.tsx`
* **Vị trí và thành phần:**
  1. **Top Header (`<header>` dòng 114 - 171):**
     - Nút "Xem Trang Báo" (`Link to="/"`) để quay về giao diện độc giả.
     - Logo thương hiệu `LocalPress Backoffice`.
     - Badge phân hệ SV4: `<span className="bg-emerald-900 text-emerald-200">Tài chính & Đối soát (SV4)</span>` (dòng 136 - 140).
     - Thông tin Kế toán viên đang đăng nhập (`currentUser.name`, role `ACCOUNTANT`).
     - Nút "Đăng xuất" (`LogOut`) xóa session và đưa về trang Login.
  2. **Sidebar bên trái (`<aside>` dòng 176 - 290):**
     - Nền tối `bg-slate-900`, rộng `w-64`, chỉ hiển thị các menu được cấp quyền cho `FINANCE_ROLES`.
     - Cụm menu **Tài Chính & Đối Soát (SV4)** gồm 6 mục:
       + Tổng quan tài chính (`/backoffice/finance`)
       + **Đơn hàng thanh toán (`/backoffice/finance/orders`)** $\rightarrow$ Đang ACTIVE với class `bg-emerald-600 text-white font-semibold`.
       + Khiếu nại thanh toán (`/backoffice/finance/complaints`)
       + Quản lý Hoàn tiền (Refund) (`/backoffice/finance/refunds`)
       + Đối soát kỳ & Chênh lệch (`/backoffice/finance/reconciliation`)
       + Sổ cái & Bút toán kế toán (`/backoffice/finance/ledger`)
  3. **Vùng nội dung động (`<main>` dòng 293 - 295):**
     - `<main className="flex-1 p-6 overflow-y-auto"><Outlet /></main>`: Nơi React Router chèn component của từng trang vào.
  4. **Thanh Role Switcher dưới đáy:** `<RoleSwitcherBar />` hỗ trợ chuyển nhanh giữa các vai trò khi thầy yêu cầu test phân quyền.

---

### 6.2. Lớp 2: Chi tiết nội dung trên màn hình (UI Page Breakdown)
* **File quản lý:** `frontend/src/features/finance/pages/OrderListPage.tsx`
* **Các khối chi tiết trên màn hình:**
  1. **Thanh Tiêu đề (Dòng 47 - 57):**
     - Tiêu đề: *"Quản lý đơn hàng & Giao dịch thanh toán"*.
     - Nút *"Làm mới dữ liệu"* kích hoạt hàm `loadOrders()` để refetch dữ liệu mới nhất.
  2. **Thanh Bộ lọc đa tiêu chí (Dòng 60 - 117):**
     - **Ô tìm kiếm từ khóa (Dòng 62 - 76):** State `search`. Lọc client-side tức thì theo `orderCode`, `userName`, `userEmail` hoặc tên bài báo/banner `targetTitle`.
     - **Dropdown Loại dịch vụ (Dòng 78 - 93):** State `typeFilter` (Tất cả / Gói Hội Viên `SUBSCRIPTION` / Mua bài lẻ `ARTICLE_PURCHASE` / Quảng cáo `AD_CAMPAIGN`).
     - **Dropdown Trạng thái thanh toán (Dòng 95 - 115):** State `statusFilter` (`ALL`, `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `REFUNDED`).
  3. **Bảng Dữ liệu giao dịch (Dòng 120 - 173):**
     - Cột Mã đơn: `o.orderCode` font mono đậm.
     - Cột Khách hàng: `o.userName` và `o.userEmail`.
     - Cột Loại dịch vụ: `o.targetTitle`.
     - Cột Số tiền: Được format qua `formatCurrency(o.finalAmount)` chuẩn VND.
     - Cột Phương thức: `o.paymentMethod` (`BANK_TRANSFER`, `VIETQR`, `MOMO`).
     - Cột Thời gian tạo: Format qua `formatDateTime(o.createdAt)` chuẩn giờ VN.
     - Cột Trạng thái: Dùng component tái sử dụng `<StatusBadge type="payment" status={o.paymentStatus} />`.
     - Cột Hành động (Dòng 155 - 167):
       + Nếu đơn là `PROCESSING` (chờ kế toán duyệt bill): Hiện nút màu vàng cam nổi bật **"Xác minh ngay"**.
       + Nếu trạng thái khác: Hiện link **"Chi tiết"**.

---

### 6.3. Lớp 3: Trace Source Code khi Click từng nút hành động cụ thể

#### Nút 1: Bấm nút "Chi tiết" hoặc "Xác minh ngay" tại một dòng đơn hàng
1. **Frontend Trigger (`OrderListPage.tsx` dòng 156 - 167):**  
   Thẻ `<Link to={`/backoffice/finance/orders/${o.id}`}>` đẩy URL trình duyệt sang `/backoffice/finance/orders/:id`.
2. **Router (`router.tsx` dòng 256 - 263):**  
   Khớp route `'finance/orders/:id'`, qua bảo vệ `<ProtectedRoute allowedRoles={FINANCE_ROLES}>`, render component `<OrderDetailPage />`.
3. **Component Mount (`OrderDetailPage.tsx` dòng 23 - 42):**  
   `useParams` lấy `id`. Hook `useEffect` gọi `loadOrder(id)` $\rightarrow$ gọi `financeApi.getOrderById(id)`.
4. **HTTP Client (`finance/api/index.ts` dòng 82 - 112):**  
   Bắn request `GET /api/v1/finance/ledger/{id}` sang Backend.
5. **REST Controller (`FinanceLedgerController.java` dòng 49 - 56):**  
   `@GetMapping("/{transactionId}")` nhận ID, gọi `financeLedgerService.getTransactionDetail(transactionId)`.
6. **Service & JPA (`FinanceLedgerService.java` dòng 87 - 97):**  
   `transactionRepository.findById(transactionId)` chạy SQL `SELECT * FROM transactions WHERE transaction_id = ?`. Ném `404` nếu không thấy; nếu thấy đóng gói trả về `ApiResponse.ok(TransactionDetailResponse)`.
7. **Render trang chi tiết (`OrderDetailPage.tsx`):**  
   State `order` được set, giao diện mở ra thông tin đơn, lịch sử thanh toán và hóa đơn (không còn nút duyệt PAID).

---

#### Nút 2: Bấm "Ghi nhận vào đơn" trên Hàng chờ khiếu nại (UC051, `/backoffice/finance/complaints`)
*(Nút "Duyệt PAID" cũ trong `OrderDetailPage.tsx` đã gỡ; ghi nhận tiền thủ công chỉ còn qua khiếu nại.)*
1. **Frontend Trigger (`ComplaintQueuePage.tsx`):**  
   Nút **Ghi nhận vào đơn** gọi `setConfirm({ c, target: 'ORDER' })` -> bật `ConfirmDialog` "Ghi nhận khoản tiền vào đơn?" (kế toán xác nhận đã khớp sao kê).
2. **HTTP API Client (`features/finance/api/payment.ts`, `complaintApi`):**  
   Bắn `POST /api/v1/finance/complaints/{id}/resolve?target=ORDER` (dual-mode: mock khi `APP_CONFIG.useMockApi`).
3. **REST Controller (`PaymentComplaintController.resolve`):**  
   `requireFinanceStaff()` kiểm tra role kế toán, lấy `accountantId` từ người đăng nhập, gọi service.
4. **Service lõi (`PaymentComplaintService.resolve`, `@Transactional`):**  
   - `findByIdForUpdate` khóa dòng khiếu nại (`PESSIMISTIC_WRITE`); không còn `OPEN` -> `409`.
   - Dựng `SepayIpnRequest(content = orderCode, amount, referenceCode = mã GD)` và gọi CHÍNH `paymentProcessingService.processSepayIpn(...)` -> chạy đủ nhánh đủ / thiếu / thừa / muộn, đơn `SUCCESS` thì phát `PaymentSuccessEvent`.
   - Kết quả `ALREADY_PROCESSED` -> `409` gợi ý chọn Cộng vào ví.
   - `c.resolve(accountantId, status, note)` -> `RESOLVED`, lưu `resolution`, `resolved_by`, `resolved_at`.
5. **Phản hồi Client:**  
   `200 OK`, hàng chờ reload, khiếu nại rời tab OPEN; khách thấy kết quả ở `/wallet/complaints`; sổ quỹ có dòng Credit mới.

---

#### Nút 3: Bấm nút "In chứng từ / Hóa đơn (UC057)"
*(Nút này nằm ở Top Bar hoặc trong ô Hóa đơn GTGT của `OrderDetailPage.tsx` dòng 95 và 225)*
1. **Frontend Trigger (`OrderDetailPage.tsx` dòng 95, 225):**  
   Kích hoạt state `setShowInvoiceModal(true)`.
2. **UI Render (`OrderDetailPage.tsx` dòng 265 - 395):**  
   Bật Modal Hóa đơn Giá trị Gia tăng & Chứng từ Điện tử mô phỏng theo Nghị định 123:
   - Thông tin Tòa soạn: BÁO ĐIỆN TỬ LOCALPRESS (MST: `0201998877`).
   - Ký hiệu: `AA/26E`, Số hóa đơn: `INV-2026-XXXX`.
   - Bảng kê chi tiết dịch vụ, tiền trước thuế, chiết khấu, thuế VAT 10% và tổng thanh toán.
   - Nhãn chứng thực số: *"Chứng từ ký số hợp lệ bởi LocalPress CA"*.
3. **Thao tác in (`window.print()`):**  
   Khi người dùng bấm **"In chứng từ ngay (Print / PDF)"** $\rightarrow$ Trình duyệt mở hộp thoại in của hệ điều hành để xuất PDF hoặc in ra giấy.
