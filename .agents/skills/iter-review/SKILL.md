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
*Tài khoản demo:* `ketoan@localpress.vn` | *Mật khẩu:* `password` | *Vai trò:* `ACCOUNTANT`

| Use Case | Chức năng / Màn hình | Link UI (Mở link nào) | File Frontend | Backend API Endpoint | Backend Controller & Service | Bảng CSDL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UC047, UC048, UC049** | **Sổ Quỹ & Chứng từ** (II.4.1) | `/backoffice/finance/ledger` | `GeneralLedgerPage.tsx` | `GET /api/v1/finance/ledger`<br>`GET /api/v1/finance/ledger/{id}`<br>`GET /api/v1/finance/ledger/summary` | `FinanceLedgerController.java`<br>`FinanceLedgerService.java` | `transactions` |
| **UC050, UC051** | **Duyệt CK Ngân hàng** (II.4.2) | `/backoffice/finance/orders` $\rightarrow$ bấm vào đơn $\rightarrow$ `/backoffice/finance/orders/:id` | `OrderListPage.tsx`<br>`OrderDetailPage.tsx` | `GET /api/v1/finance/manual-transfers/pending`<br>`POST /api/v1/finance/manual-transfers/{id}/confirm`<br>`POST /api/v1/finance/manual-transfers/{id}/reject` | `ManualBankTransferController.java`<br>`ManualBankTransferService.java` | `transactions`<br>`users` |
| **UC052** | **Tổng quan Tài chính** (II.4.5) | `/backoffice/finance` | `FinanceDashboard.tsx` | `GET /api/v1/finance/dashboard` | `FinanceDashboardController.java`<br>`FinanceLedgerService.java` | `transactions` |
| **UC053** | **Công nợ Quảng cáo B2B** (II.4.4) | `/backoffice/finance/orders?type=AD_CAMPAIGN` | `OrderListPage.tsx` | `GET /api/v1/finance/receivables` *(Iter 2)* | `AdvertiserReceivablesController.java` *(Iter 2)* | `ad_campaigns`<br>`transactions` |
| **UC054** | **Đối soát Ngân hàng** (II.4.6) | `/backoffice/finance/reconciliation` | `ReconciliationPage.tsx` | `GET /api/v1/finance/reconciliation`<br>`POST /api/v1/finance/reconciliation/resolve` | `FinanceReconciliationController.java` *(Iter 3)* | `transactions` |
| **UC055, UC056** | **Hoàn tiền 4 Mắt** (II.4.7) | `/backoffice/finance/refunds` | `RefundManagementPage.tsx` | `GET /api/v1/finance/refunds`<br>`POST /api/v1/finance/refunds/propose`<br>`POST /api/v1/finance/refunds/{id}/review-refund` | `RefundManagementController.java` *(Iter 3)* | `refund_requests`<br>`transactions` |
| **UC057, UC058** | **Chứng từ & Bút toán kép** | `/backoffice/finance/ledger` | `GeneralLedgerPage.tsx` | `GET /api/v1/finance/ledger` | `FinanceLedgerController.java` | `transactions` |

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

### 2.1. Luồng 1 (SV4 Trọng tâm): Kiểm soát Sổ cái Tài chính & Dòng tiền
1. Mở trình duyệt: `http://localhost:5173/login`.
2. Đăng nhập: `ketoan@localpress.vn` / `password`.
3. Hệ thống tự nhận role `ACCOUNTANT` $\rightarrow$ Điều hướng tới `/backoffice/finance` (`FinanceDashboard.tsx`).
4. Bấm menu **Sổ Quỹ** hoặc mở link: `/backoffice/finance/ledger` (`GeneralLedgerPage.tsx`).
5. **Điểm cần chỉ cho thầy xem:**
   - 3 Card KPI đầu trang:
     + Tổng phát sinh Thu (Credit): Tính tổng mọi giao dịch `SUCCESS` tiền vào.
     + Tổng phát sinh Hoàn (Debit): Tính tổng các đơn `REFUNDED` tiền ra.
     + Số dư thực tế ròng (Net Balance): $\text{Net} = \text{Credit} - \text{Debit}$.
   - Bảng nhật ký chứng từ: Có mã bút toán, thời gian, loại giao dịch, diễn giải, người ghi nhận.

---

### 2.2. Luồng 2 (SV4 Trọng tâm): Duyệt chuyển khoản Ngân hàng thủ công
1. Đăng nhập Kế toán $\rightarrow$ Vào **Quản lý đơn hàng**: `/backoffice/finance/orders` (`OrderListPage.tsx`).
2. Tại thanh lọc nhanh, bấm lọc trạng thái: **"Đang xác minh" (`PROCESSING`)** hoặc **"Chờ TT" (`PENDING`)**.
3. Bấm vào chi tiết đơn hàng (icon mắt hoặc click dòng) $\rightarrow$ `/backoffice/finance/orders/:id` (`OrderDetailPage.tsx`).
4. **Điểm cần chỉ cho thầy xem:**
   - Khung màu vàng nổi bật: **"Xác thực ủy nhiệm chi chuyển khoản thủ công"**.
   - Mã tham chiếu ngân hàng khách cung cấp.
   - Số tiền cần đối chiếu (VND đỏ đậm).
   - Ảnh biên lai ủy nhiệm chi (bấm vào xem phóng to).
5. **Thao tác hành động:**
   - Bấm nút xanh: **"Xác nhận tiền đã vào tài khoản (Duyệt PAID)"**.
   - Modal/Alert thông báo: Đơn hàng chuyển sang trạng thái `PAID`.
   - Mở lại `/backoffice/finance/ledger` $\rightarrow$ Bút toán mới đã tự động sinh vào bảng Sổ cái.

---

### 2.3. Luồng 3 (SV1 & SV4 Liên thông): Doanh nghiệp đặt vị trí & Thanh toán
1. Đăng nhập Doanh nghiệp: `adv.canghaiphong@gmail.com` / `password` $\rightarrow$ Vào `/advertiser/slots`.
2. Doanh nghiệp xem thông số vị trí: Kích thước tiêu chuẩn (1140x120, 728x90, 300x600), Đơn giá/ngày.
3. Bấm **Đặt vị trí này** $\rightarrow$ Sang `/advertiser/bookings/new` $\rightarrow$ Chọn ngày bắt đầu, ngày kết thúc.
4. Hệ thống tính tổng tiền $\rightarrow$ Tạo đơn $\rightarrow$ Chuyển sang thanh toán (`/advertiser/billing` gọi API `POST /api/v1/finance/orders` của SV4).
5. Đơn hàng chuyển sang SV4 chờ đối soát gạch nợ.

---

### 2.4. Luồng 4 (SV3 & SV5 Liên thông): Đọc báo Free vs Paywall Premium
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

#### Tình huống 1: Thầy yêu cầu: *"Bắt buộc mã bút toán chuyển khoản ngân hàng phải có tối thiểu 6 ký tự và không được để trống"*
- **Sửa ở đâu:** Mở file DTO Backend:
  `backend/src/main/java/com/localpress/finance/dto/request/ManualTransferConfirmRequest.java`
- **Cách sửa:**
  ```java
  // Thêm annotation Jakarta Validation:
  @NotBlank(message = "Mã bút toán ngân hàng không được để trống")
  @Size(min = 6, message = "Mã bút toán ngân hàng phải có tối thiểu 6 ký tự")
  private String bankReferenceCode;
  ```
- **Giải thích với thầy:** File này là DTO tiếp nhận request. Trong `ManualBankTransferController.java` đã gắn `@Valid`, nên khi vi phạm Spring sẽ tự động chặn và trả lỗi `400 Bad Request` qua `FinanceExceptionHandler`.

---

#### Tình huống 2: Thầy yêu cầu: *"Chặn không cho nhập số tiền âm hoặc bằng 0 khi tạo giao dịch"*
- **Sửa ở đâu:**
  - File Backend: `backend/src/main/java/com/localpress/finance/model/Transaction.java` hoặc DTO tạo đơn.
- **Cách sửa:**
  Thêm annotation `@DecimalMin(value = "1000.00", message = "Số tiền tối thiểu là 1.000 VNĐ")` trên trường `amount`.

---

### 3.2. Nhóm 2: Sửa Quy tắc Nghiệp vụ & State Machine (Business Logic)

#### Tình huống 3: Thầy yêu cầu: *"Khi Kế toán từ chối (Reject) chuyển khoản, bắt buộc phải lưu lý do từ chối vào Database chứ không chỉ đổi trạng thái"*
- **Bước 1: Sửa Entity** `backend/src/main/java/com/localpress/finance/model/Transaction.java`:
  ```java
  @Column(name = "rejection_reason", length = 500)
  private String rejectionReason;

  public void rejectManualTransfer(Long accountantUserId, String reason) {
      if (this.status != TransactionStatus.PENDING) {
          throw new AppException("Chỉ từ chối được giao dịch PENDING", HttpStatus.CONFLICT);
      }
      this.status = TransactionStatus.FAILED;
      this.reconciledAt = LocalDateTime.now();
      this.reconciledBy = accountantUserId;
      this.rejectionReason = reason; // <-- Lưu lý do vào entity
  }
  ```
- **Bước 2: Sửa Service** `backend/src/main/java/com/localpress/finance/service/ManualBankTransferService.java`:
  Tìm hàm `rejectTransfer`:
  ```java
  // Sửa dòng gọi hàm domain:
  tx.rejectManualTransfer(accountantUserId, request.getRejectionReason());
  ```

---

#### Tình huống 4: Thầy yêu cầu: *"Chặn nguyên tắc 4 mắt: Người tạo đơn không được tự duyệt đơn của chính mình"*
- **Sửa ở đâu:** Mở `ManualBankTransferService.java`, chèn thêm logic kiểm tra vào đầu hàm `confirmTransfer`:
  ```java
  if (tx.getUserId().equals(accountantUserId)) {
      throw new AppException("Kế toán không được tự phê duyệt giao dịch do chính mình tạo (Quy tắc 4 mắt)", HttpStatus.FORBIDDEN);
  }
  ```

---

#### Tình huống 5: Thầy yêu cầu: *"Chống gạch trùng giao dịch (Idempotency) nếu đã có mã giao dịch cổng này"*
- **Sửa ở đâu:** Mở `ManualBankTransferService.java` (đoạn dòng 103-113):
  ```java
  if (request.getBankReferenceCode() != null && !request.getBankReferenceCode().isBlank()) {
      String refCode = request.getBankReferenceCode().trim();
      transactionRepository.findByGatewayTransactionId(refCode)
              .filter(existing -> !existing.getTransactionId().equals(transactionId))
              .ifPresent(existing -> {
                  throw new AppException("Mã bút toán [" + refCode + "] đã được sử dụng cho giao dịch #" + existing.getTransactionId(), HttpStatus.CONFLICT);
              });
  }
  ```

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
- [ ] **Tab Trình duyệt 1 (Kế toán SV4):** Mở sẵn `/backoffice/finance/orders` và `/backoffice/finance/ledger` (đã đăng nhập `ketoan@localpress.vn`).
- [ ] **Tab Trình duyệt 2 (Khách Guest SV3):** Mở cửa sổ ẩn danh sẵn trang chủ `/` và bài điều tra Premium.
- [ ] **IDE VSCode mở sẵn các file quan trọng:**
  1. `backend/.../finance/controller/ManualBankTransferController.java`
  2. `backend/.../finance/service/ManualBankTransferService.java`
  3. `backend/.../finance/model/Transaction.java`
  4. `frontend/src/features/finance/pages/OrderDetailPage.tsx`
  5. `frontend/src/features/finance/pages/GeneralLedgerPage.tsx`
