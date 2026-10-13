# LocalPress Team Feature Allocation & Frontend Guidelines (SV1 - SV5)

Hướng dẫn phân bổ chi tiết 48 màn hình và luồng giao diện cho 5 sinh viên nhóm 2 theo `AGENTS.md` và `project_tracking_group2.xlsx`.

---

## 1. SV1: TÂY — CỔNG DOANH NGHIỆP QUẢNG CÁO (ADVERTISER PORTAL)
- **Thư mục làm việc:** `frontend/src/features/advertising/` và `frontend/src/layouts/AdvertiserLayout.tsx`
- **Màu sắc & Phong cách:** Tone màu Xanh Navy `#1e3a8a` phối Slate sạch sẽ, hiện đại chuẩn cổng B2B Self-Service.
- **Vai trò đăng nhập demo:** `ADVERTISER` (`user-adv-1`, `user-adv-2`)
- **Danh sách màn hình phụ trách:**
  1. `AdvertiserDashboard.tsx`: Tổng quan chiến dịch, biểu đồ Impressions/Clicks/CTR (Recharts), số dư chi tiêu.
  2. `AdSlotsExplorerPage.tsx`: Tra cứu danh mục vị trí quảng cáo (`ad_slots`), kích thước (Desktop/Mobile), đơn giá theo ngày/tuần, tình trạng trống lịch.
  3. `NewBookingPage.tsx`: Form đặt chỗ quảng cáo, chọn slot, chọn khoảng ngày, tính tiền tạm tính.
  4. `BookingListPage.tsx`: Danh sách đơn booking B2B của doanh nghiệp, lọc trạng thái (`SUBMITTED`, `QUOTED`, `CONFIRMED`).
  5. `BookingDetailPage.tsx`: Xem chi tiết báo giá từ tòa soạn, nút "Chấp nhận báo giá & Tiếp tục thanh toán".
  6. `CampaignDetailPage.tsx`: Quản lý banner sáng tạo (`ad_creatives`), tải ảnh banner mới (sinh v2 `IN_REVIEW`), xem link đích và số liệu thống kê.
  7. `AdvertiserBillingPage.tsx`: Lịch sử hóa đơn, tải chứng từ thanh toán B2B, biên lai.
- **Quy tắc bất biến cần nhớ:**
  - Multi-tenant Isolation (Rule 14): Doanh nghiệp A chỉ xem booking và banner của doanh nghiệp A.
  - Ad Serving Gate (Rule 9): Banner mới upload chỉ được chạy khi đã được tòa soạn phê duyệt (`APPROVED`).

---

## 2. SV2: TRỌNG PHAN — TÒA SOẠN, BIÊN TẬP & KIỂM DUYỆT (EDITORIAL & MODERATION)
- **Thư mục làm việc:** `frontend/src/features/editorial/` (và các trang trong `BackofficeLayout.tsx` với quyền `canSeeEditorial`)
- **Màu sắc & Phong cách:** Tone Sky Blue / Slate Backoffice chuyên nghiệp, tập trung vào năng suất xử lý dữ liệu.
- **Vai trò đăng nhập demo:** `EDITOR` (`user-editor`), `REVIEWER` (`user-reviewer`)
- **Danh sách màn hình phụ trách:**
  1. `ArticleListPage.tsx`: Quản lý bài viết tòa soạn, lọc theo chuyên mục và trạng thái (`DRAFT`, `IN_REVIEW`, `APPROVED`, `PUBLISHED`).
  2. `ArticleEditorPage.tsx`: CMS soạn thảo bài viết, nhập tiêu đề, sapo, gắn thẻ tag, chọn ảnh đại diện, lưu bản nháp hoặc nộp duyệt.
  3. `BookingManagementPage.tsx`: Hàng đợi duyệt booking quảng cáo của doanh nghiệp, nhập đơn giá chiết khấu và ban hành báo giá (`QUOTED`).
  4. `CreativeReviewPage.tsx`: Kiểm duyệt banner quảng cáo do doanh nghiệp tải lên, nút "Duyệt banner" hoặc "Yêu cầu chỉnh sửa kèm lý do".
  5. `CommentModerationPage.tsx`: Kiểm duyệt bình luận độc giả (`PENDING`, `APPROVED`, `REJECTED`), gắn cờ vi phạm quy chuẩn cộng đồng.
- **Quy tắc bất biến cần nhớ:**
  - Bình luận sau khi sửa phải kiểm duyệt lại (Rule 12).
  - Tòa soạn có quyền "Dừng khẩn cấp" banner nếu phát hiện nội dung độc hại (Rule 9).
  - AI chỉ có vai trò Cố vấn (Rule 13): AI đề xuất tiêu đề/sapo nhưng biên tập viên là người bấm lưu/nộp.

---

## 3. SV3: HOÀNG — TRẢI NGHIỆM ĐỘC GIẢ & NỘI DUNG (READER EXPERIENCE)
- **Thư mục làm việc:** `frontend/src/features/reader/`, `src/layouts/PublicLayout.tsx`, `src/layouts/ReaderAccountLayout.tsx`
- **Màu sắc & Phong cách:** Phong cách báo giấy ngà cổ điển (`editorial.paper` `#fdfbf7`, nền `#fafaf9`), phông Serif Merriweather cho bài báo, điểm xuyết Đỏ Trầm Crimson và Vàng Hội Viên Gold.
- **Vai trò đăng nhập demo:** `GUEST`, `READER` thường (`user-reader-free`), `READER` VIP (`user-reader-premium`)
- **Danh sách màn hình phụ trách:**
  1. `HomePage.tsx`: Trang chủ báo Hải Phòng, tin tâm điểm (Hero story), tin dòng sự kiện, tin đọc nhiều, khối chuyên mục nổi bật.
  2. `ArticleDetailPage.tsx`: Giao diện đọc bài viết đầy đủ hoặc đọc preview 30% kèm `PaywallPrompt` nếu là bài Premium.
  3. `CategoryPage.tsx`: Danh sách tin theo chuyên mục phân cấp (Thời sự, Cảng biển, Kinh tế, Du lịch...).
  4. `SearchPage.tsx`: Tìm kiếm bài viết theo từ khóa và bộ lọc chuyên mục/thời gian.
  5. `PremiumPlansPage.tsx`: Bảng giá các gói cước đọc báo VIP (Tháng, Quý, Năm) với danh sách quyền lợi chi tiết.
  6. `CheckoutPage.tsx`: Giỏ hàng và cổng tạo đơn thanh toán mua gói VIP hoặc mua lẻ bài viết 15.000 ₫.
  7. `PaymentResultPage.tsx`: Thông báo kết quả giao dịch và mã đơn hàng.
  8. `ReaderAccountPage.tsx` & `ReaderLibraryPage.tsx`: Tủ sách cá nhân, bài viết đã mua, bài đã lưu (bookmark), lịch sử đọc tin.
  9. `ReaderDevicesPage.tsx`: Quản lý tối đa 2 thiết bị đăng nhập đồng thời.
- **Quy tắc bất biến cần nhớ:**
  - Khách đọc Free 100% không bắt đăng nhập (Rule 1).
  - Server-side Paywall (Rule 3): Độc giả chưa mua chỉ nhận 30% văn bản, không dùng CSS làm mờ toàn văn.
  - Ad-Free không làm lệch thống kê quảng cáo (Rule 15).

---

## 4. SV4: HUY (LEADER) — KẾ TOÁN, THANH TOÁN & ĐỐI SOÁT (FINANCE & RECONCILIATION)
- **Thư mục làm việc:** `frontend/src/features/finance/` và Quản trị Tầng Dùng Chung toàn dự án (`src/components/`, `src/lib/`, `src/app/`)
- **Màu sắc & Phong cách:** Tone Emerald Green / Slate Backoffice số liệu kế toán rõ ràng, chính xác.
- **Vai trò đăng nhập demo:** `FINANCE_STAFF` (`user-fin-staff`), `FINANCE_MANAGER` (`user-fin-mgr`)
- **Danh sách màn hình phụ trách:**
  1. `FinanceDashboard.tsx`: Báo cáo dòng tiền, tổng doanh thu B2B + B2C, tỷ lệ thanh toán tự động VietQR vs Chuyển khoản thủ công.
  2. `OrderListPage.tsx`: Quản lý toàn bộ đơn hàng hệ thống, phân loại (`SUBSCRIPTION`, `ARTICLE_PURCHASE`, `AD_CAMPAIGN`), lọc trạng thái thanh toán.
  3. `OrderDetailPage.tsx`: Chi tiết biên lai, đối chiếu mã giao dịch ngân hàng và nút xác nhận thu tiền cho đơn chuyển khoản thủ công.
  4. `RefundManagementPage.tsx`: Quy trình hoàn tiền tuân thủ nguyên tắc 4 mắt (Four-Eyes Principle): Kế toán viên lập đề xuất $\rightarrow$ Kế toán trưởng phê duyệt.
  5. `ReconciliationPage.tsx`: Đối soát kỳ thanh toán, phát hiện các khoản tiền lệch (Discrepancies) giữa sao kê ngân hàng và hệ thống.
  6. `GeneralLedgerPage.tsx`: Sổ quỹ kế toán kép ghi nhận bút toán Nợ (Debit) và Có (Credit) minh bạch.
- **Quy tắc bất biến cần nhớ:**
  - Giới hạn số tiền hoàn (Rule 11): Hoàn tiền không bao giờ vượt quá số tiền thực thu của đơn gốc.
  - Bốn mắt (Four-Eyes): Kế toán viên tạo đề xuất không thể tự bấm duyệt đề xuất của chính mình.
  - Tầng dùng chung (Rule 20): Leader làm chủ `SecurityConfig` (Backend) và các Core Providers/Layouts (Frontend).

---

## 5. SV5: TÙNG — HỆ THỐNG, PAYWALL, AD SERVING & AI (ADMINISTRATION & PLATFORM)
- **Thư mục làm việc:** `frontend/src/features/administration/`
- **Màu sắc & Phong cách:** Tone Purple / Dark Slate quản trị cao cấp, bảng điều khiển hệ thống.
- **Vai trò đăng nhập demo:** `SYSTEM_ADMIN` (`user-admin`)
- **Danh sách màn hình phụ trách:**
  1. `AdminDashboard.tsx`: Tổng quan hoạt động hệ thống, số lượng tài khoản, CPU/RAM, tình trạng phân phối tin tức.
  2. `UserManagementPage.tsx`: Quản lý tài khoản người dùng và gán vai trò RBAC (`READER`, `ADVERTISER`, `EDITOR`, `REVIEWER`, `FINANCE_STAFF`, `SYSTEM_ADMIN`).
  3. `PaywallConfigPage.tsx`: Cấu hình tham số Paywall máy chủ (tỷ lệ preview mặc định 30%, giới hạn tối đa 2 thiết bị).
  4. `AdDeliveryMonitorPage.tsx`: Giám sát động cơ phân phối banner theo thời gian thực, phát hiện và lọc gian lận click (Anti-fraud click tracker).
  5. `AuditLogsPage.tsx`: Nhật ký kiểm toán an ninh toàn hệ thống (ai thực hiện hành động gì, lúc nào, đối tượng nào, địa chỉ IP).
- **Quy tắc bất biến cần nhớ:**
  - AI đóng vai trò Cố vấn (Rule 13): Trợ lý AI gợi ý tiêu đề/sapo chứ không tự động xuất bản hay trừ tiền.
  - Audit log bất biến (Rule 19 của Database): Không cho phép chỉnh sửa hoặc xóa lịch sử kiểm toán.
