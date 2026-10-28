# LOCALPRESS PROJECT CONTEXT & AGENT OPERATIONAL RULES
> **Dự án:** LocalPress — Revenue & Trust Platform (Báo điện tử địa phương: Doanh thu kép & Kiểm duyệt tin tức)  
> **Môn học:** SWP391 — Học kỳ FALL 2026 — Đại học FPT  
> **Phạm vi tài liệu:** Bản ghi nhớ ngữ cảnh bất biến (Permanent Architectural Memory & Operational Guidelines) cho toàn bộ AI Agents và Lập trình viên.

---

## 1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)
LocalPress là giải pháp báo điện tử địa phương (mô hình mẫu: TP. Hải Phòng) giải quyết bài toán tự chủ tài chính cho các cơ quan báo chí cấp tỉnh, vận hành theo mô hình **Doanh thu kép (Hybrid Revenue Model)**:
1. **B2B (Quảng cáo doanh nghiệp tự phục vụ):** Doanh nghiệp tra cứu vị trí trống (`ad_slots`), đặt chỗ theo ngày, tải banner, theo dõi chỉ số minh bạch (Impressions, Clicks, CTR).
2. **B2C (Nội dung chuyên sâu trả phí - Paywall):** Độc giả đọc bài Free không cần tài khoản; trả tiền mua lẻ từng phóng sự điều tra (vd: 15.000 ₫/bài) hoặc mua gói hội viên định kỳ (tháng/năm).
3. **Tòa soạn số & Kiểm duyệt đa cấp:** Quy trình xuất bản bài viết nhiều phiên bản (`article_versions`), kiểm duyệt banner quảng cáo trước khi phát hành, kiểm duyệt bình luận cộng đồng, tích hợp trợ lý AI gợi ý tiêu đề/sapo/chuyên mục.
4. **Tài chính & Đối soát chặt chẽ:** Quản lý đơn hàng tập trung, tích hợp cổng thanh toán VietQR/MoMo/VNPay xử lý Webhook Idempotent, đối soát dòng tiền và hoàn tiền theo nguyên tắc 4 mắt (Four-Eyes Principle).

---

## 2. PHÂN CÔNG THÀNH VIÊN & LUỒNG NGHIỆP VỤ (TEAM RACI)
Dự án gồm **5 sinh viên**, mỗi sinh viên làm chủ trọn vẹn 1 luồng nghiệp vụ end-to-end (Frontend + Backend + DB logic). Kiến trúc và tiến độ được quản lý trực tiếp qua **77 Use Cases (`UC001` - `UC077`)** và **48 Màn hình / Phân hệ chức năng** trong bảng theo dõi chính thức [`project_tracking_group2.xlsx`](project_tracking_group2.xlsx), được cụ thể hóa từ **125 tiêu chí nghiệp vụ** trong tài liệu yêu cầu gốc [`LocalPress_Danh_muc_chuc_nang.docx`](LocalPress_Danh_muc_chuc_nang.docx):

| Thành viên | Luồng nghiệp vụ | Phân hệ chính | Use Cases & Màn hình (`project_tracking_group2.xlsx`) | Đặc tả chi tiết (`LocalPress_Danh_muc_chuc_nang.docx`) |
| :--- | :--- | :--- | :--- | :--- |
| **SV4: Huy (Leader)** | **Kế toán, Thanh toán & Đối soát** | `finance`, `transactions`, `refund_requests` | **14 Use Cases (`UC047` - `UC060`)**, **12 Màn hình / Chức năng** (SRS/SDS II.4.1 - II.4.12) theo tracking riêng `docs/sv4/01_output/TRACKING_SV4.xlsx`, sắp theo hành trình của tiền, mỗi iter là 1 luồng hoàn chỉnh theo swimlane. Sắp xếp theo: Iter 1 (3), Iter 2 (5), Iter 3 (4). | 25 tiêu chí (12 P0, 12 P1, 1 P2): Bộ xử lý thanh toán dùng chung, Webhook IPN, hóa đơn/chứng từ, sổ quỹ kép, đối soát ngân hàng, hoàn tiền 4 mắt. |
| **SV1: Tây** | **Doanh nghiệp (Advertiser Portal)** | `advertising`, `advertisers`, `ad_campaigns` | **14 Use Cases (`UC001` - `UC014`)**, **10 Màn hình / Chức năng** (SRS/SDS II.1.1 - II.1.10). Sắp xếp theo: Iter 1 (2), Iter 2 (4), Iter 3 (4). | 25 tiêu chí (16 P0, 9 P1, 0 P2): Cổng B2B, tra cứu slot trống, gửi booking, upload creative, xem báo cáo hiệu suất CTR, hồ sơ & chứng từ B2B. |
| **SV2: Trọng Phan** | **Tòa soạn, Vận hành & Phê duyệt** | `editorial`, duyệt bài, duyệt ad, duyệt comment | **14 Use Cases (`UC015` - `UC028`)**, **10 Màn hình / Chức năng** (SRS/SDS II.2.1 - II.2.10). Sắp xếp theo: Iter 1 (2), Iter 2 (4), Iter 3 (4). | 25 tiêu chí (14 P0, 8 P1, 3 P2): Dashboard kinh doanh tòa soạn, duyệt báo giá/hợp đồng, kiểm duyệt banner, kiểm duyệt bài viết, kiểm duyệt comment, quản lý gói đọc. |
| **SV3: Hoàng** | **Khách & Độc giả (Reader Experience)** | `reader`, `articles` (public), `subscriptions` | **18 Use Cases (`UC029` - `UC046`)**, **10 Màn hình / Chức năng** (SRS/SDS II.3.1 - II.3.10). Sắp xếp theo: Iter 1 (3), Iter 2 (4), Iter 3 (3). | 25 tiêu chí (18 P0, 6 P1, 1 P2): Đọc báo Free 100%, preview Paywall, giỏ hàng/checkout gói & bài lẻ, tủ sách cá nhân, bookmark/follow, quản lý 2 thiết bị. |
| **SV5: Tùng** | **Hệ thống, Paywall, Ad Serving & AI** | `delivery`, `content` CMS, `administration`, AI | **17 Use Cases (`UC061` - `UC077`)**, **10 Màn hình / Chức năng** (SRS/SDS II.5.1 - II.5.10). Sắp xếp theo: Iter 1 (2), Iter 2 (3), Iter 3 (5). | 25 tiêu chí (17 P0, 7 P1, 1 P2): CMS soạn bài & phiên bản, Paywall Engine ở máy chủ, Ad Serving Engine chống gian lận click, cấu hình slot, trợ lý AI biên tập, audit logs. |

### Lộ trình 3 Đợt triển khai theo Activity Flow (Đầu $\rightarrow$ Giữa $\rightarrow$ Cuối quy trình):
* **Iteration 1 — Đầu quy trình (12 màn hình):** Ingestion, Setup, Master Data, Đọc Free & Soạn bài cơ bản.
  * SV1: `Company Profile`, `Ad Slot Catalog`
  * SV2: `Article Review and Publishing`, `Content Policy and Moderation`
  * SV3: `Homepage and Article Search`, `Article Reader`, `Authentication`
  * SV4: `Payment Checkout`, `LocalPress Wallet and Top-up`, `SePay Webhook and Payment Log` (UC047 - UC050; luồng thu tiền, swimlane SV4-01, SV4-02)
  * SV5: `Article Editor`, `Article Metadata and Media`
* **Iteration 2 — Giữa quy trình (20 màn hình):** Giao dịch lõi, Thanh toán QR/IPN, Paywall Server-side, Booking & Duyệt banner.
  * SV1: `Campaign Booking`, `Quotation Confirmation`, `Advertising Payment`, `Creative Submission and Preview`
  * SV2: `Pending Booking Queue`, `Advertising Inventory Calendar`, `Quotation Management`, `Creative Review`
  * SV3: `Premium Checkout`, `Premium Article Reader`, `Personal Bookshelf`, `Comments and Reports`
  * SV4: `Payment Complaint (Customer)`, `Cash Flow Dashboard`, `Payment Complaint Queue`, `Financial Ledger`, `Payment Orders and Financial Documents` (UC051, UC052, UC058, UC057; luồng ngoại lệ và ghi sổ, swimlane SV4-03, SV4-06)
  * SV5: `Article Version History`, `Article Submission and Revision`, `Content Access and Paywall`
* **Iteration 3 — Cuối quy trình (20 màn hình):** Đối soát, Hoàn tiền 4 mắt, Báo cáo & Dashboard, AI Cố vấn, Ad Serving & Admin.
  * SV1: `Advertising Dashboard`, `Creative Replacement`, `Requests and Business Notifications`, `Contracts and Documents`
  * SV2: `Campaign Eligibility Check`, `Campaign Control`, `Advertising Contract Management`, `Business Operation Dashboard`
  * SV3: `Followed Content`, `Devices and Sessions`, `Subscription, Transactions and Support`
  * SV4: `Payment Reconciliation`, `Advertiser Receivables`, `Refund and Rights Management`, `Financial Reports and Alerts` (UC053 - UC056, UC059, UC060; luồng cuối kỳ, swimlane SV4-04, SV4-05, SV4-07)
  * SV5: `AI Editorial Assistant`, `Advertising Slot Configuration`, `Advertisement Delivery and Tracking`, `Advertisement URL Monitoring`, `System Administration Console`

---

## 3. 21 QUY TẮC NGHIỆP VỤ & VẬN HÀNH BẤT BIẾN (INVARIANT RULES)
Bất kỳ mã nguồn hoặc cấu trúc API nào được tạo ra **BẮT BUỘC PHẢI TUÂN THỦ 21 QUY TẮC SAU**:

1. **Đọc Free 100% không bắt đăng nhập:** Khách (Guest) đọc toàn bộ bài Free, xem chuyên mục, tìm kiếm và xem bình luận đã duyệt mà không bị ép mở modal login.
2. **Quyền Premium theo Scope, không dùng biến boolean đơn giản:** Người dùng có thể mua bài lẻ (`article_purchases`) hoặc mua gói theo chuyên mục/toàn trang (`subscriptions`). Không được dùng cờ `is_premium = true` để quyết định tất cả.
3. **Paywall thực thi ở tầng Server-side:** Khi bài là PREMIUM và người đọc chưa mua, API/HTML **CHỈ ĐƯỢC TRẢ VỀ PREVIEW (30% VĂN BẢN)**. Tuyệt đối không trả toàn văn trong JSON/HTML rồi dùng CSS làm mờ (chống soi F12 Inspect).
4. **Xác minh thanh toán độc lập ở Backend:** Không bao giờ cấp quyền hay duyệt đơn chỉ dựa vào URL chuyển hướng thành công trên trình duyệt (`return_url`). Phải đợi Webhook IPN có chữ ký số (HMAC SHA512) từ Cổng thanh toán.
5. **Webhook Idempotency & Tự phục hồi:** Xử lý Webhook phải có cơ chế Idempotent (dựa vào `transaction_code` hoặc `idempotency_key`). Nếu Webhook gửi lại nhiều lần, không được cộng tiền hoặc cấp quyền 2 lần. Nếu tiền đã trừ nhưng cấp quyền lỗi, hệ thống phải lưu trạng thái chờ đối soát thử lại.
6. **Xử lý tiền về sau khi hết hạn giữ chỗ:** Đơn booking quảng cáo giữ chỗ tạm thời có thời hạn (vd: 15-30 phút). Nếu tiền về muộn sau khi slot đã hết hạn, hệ thống kiểm tra lại lịch: nếu còn chỗ thì kích hoạt, nếu đã có người khác mua thì đưa vào hàng đợi hoàn tiền/chọn lịch mới.
7. **Chống trùng lịch (Double Booking) tại Database & Server:** Cơ chế kiểm tra xung đột thời gian quảng cáo `(start_date <= :newEnd AND end_date >= :newStart)` với slot độc quyền phải được kiểm tra bằng database transaction lock (Pessimistic / Optimistic Lock).
8. **Phiên bản hóa Creative quảng cáo & Bài viết:** Khi thay ảnh/URL banner đang chạy, hệ thống tạo bản ghi mới (`ad_creatives.version_number`). Chiến dịch vẫn chạy bản cũ cho đến khi bản mới được duyệt (`APPROVED`). Bài viết đã xuất bản khi sửa cũng sinh phiên bản mới trong `article_versions`.
9. **Điều kiện chạy chiến dịch (Ad Serving Gate):** Quảng cáo chỉ được hiển thị khi thỏa mãn ĐỦ 5 điều kiện: (1) Lịch còn hạn, (2) Slot đang kích hoạt, (3) Creative ở trạng thái `APPROVED`, (4) Hợp đồng/Thanh toán đã hoàn tất, (5) Không bị dừng khẩn cấp.
10. **Tắt gia hạn khác với hoàn tiền:** Hủy tự động gia hạn (`cancel_auto_renew`) chỉ có hiệu lực ở kỳ tiếp theo, người dùng vẫn giữ quyền đọc đến hết kỳ đã trả tiền.
11. **Giới hạn số tiền hoàn (Refund Cap):** Tổng số tiền hoàn qua các đợt không bao giờ vượt quá số tiền thực thu của giao dịch gốc. Mọi yêu cầu hoàn tiền đang xử lý (`PENDING`) phải được tính vào hạn mức hoàn.
12. **Bình luận sau khi sửa phải kiểm duyệt lại:** Bình luận đã duyệt nếu người dùng chỉnh sửa nội dung thì trạng thái tự động chuyển về `PENDING`, không được hiển thị công khai cho đến khi Moderator duyệt lại.
13. **AI có vai trò Cố vấn (Human-in-the-Loop):** AI chỉ gợi ý tiêu đề, tóm tắt, tag, hoặc đề xuất giá/cảnh báo fraud. AI không bao giờ tự ý quyết định trừ tiền, xuất bản bài viết hoặc cấp quyền đọc.
14. **Cách ly dữ liệu đa người thuê (Multi-tenant Isolation):** Doanh nghiệp A tuyệt đối không được xem báo cáo CTR, banner hoặc hóa đơn của Doanh nghiệp B, kể cả khi đoán được ID trên URL (chống lỗ hổng IDOR).
15. **Quyền độc giả Ad-Free không làm sai lệch số liệu:** Khi độc giả có gói Ad-Free đọc bài, hệ thống không tính lượt đọc này là một slot quảng cáo bị bỏ trống (Unfilled Impression).
16. **Nhất quán định nghĩa chỉ số:** Số liệu Impressions, Clicks, CTR, MRR, ARR, Doanh thu trên Dashboard doanh nghiệp, Dashboard tòa soạn và Báo cáo xuất file phải khớp 100% về công thức và mốc thời gian.
17. **Nguyên tắc phân định ranh giới & Code Ownership (Strict Boundary):** Tuyệt đối **KHÔNG ĐƯỢC PHÉP SỬA ĐỔI** code, giao diện, bảng dữ liệu hoặc logic thuộc phân hệ của thành viên khác (`advertising` - SV1, `editorial` - SV2, `reader` - SV3, `delivery`/CMS/AI/`administration` - SV5). Mỗi thành viên chỉ làm đúng phần của mình (SV4 - Huy: Kế toán, Thanh toán & Đối soát trong `com.localpress.finance`, `transactions`, `refund_requests`, tài liệu tài chính). Mọi giao tiếp liên module chỉ đi qua Shared Service Contracts / DTOs / Events dùng chung, không can thiệp trực tiếp vào mã nguồn nội bộ của module khác.
18. **Phong cách giao tiếp với Leader & Quy ước xưng hô nội bộ (Communication Tone & Team Addressing):**
    - Trao đổi với Leader: Ngắn gọn, thực tế, đúng phong cách anh em trong đội làm đồ án. Tuyệt đối không dùng icon, emoji màu mè, không văn vở hoa mỹ. Luôn giữ vai trò Technical Lead / Master Reviewer hỗ trợ Leader rà soát code các thành viên để chống conflict và bảo vệ kiến trúc.
    - Quy ước xưng hô khi soạn thảo tin nhắn (message) cho Leader Huy gửi thành viên trong nhóm:
      + Với **Phan (SV2)**, **Hoàng (SV3)**, **Tùng (SV5)**: Leader Huy gọi là **"anh"**, xưng **"em"** (Ví dụ: "Anh Hoàng ơi, em vừa review...", "Anh Tùng ơi, em thấy...").
      + Riêng với **Tây (SV1)**: Leader Huy xưng là **"anh"**, gọi Tây là **"em"** (Ví dụ: "Tây ơi, anh review thấy...", "Anh bảo Tây này...").
19. **Nguyên tắc "Đọc kỹ AGENTS.md, thiếu thì hỏi xin tài liệu, cấm tự đoán" (Strict Verification):** Trước khi phân tích, viết code hay đánh giá bất kỳ chức năng nào, bắt buộc phải tra cứu kỹ trong `AGENTS.md`, `project_tracking_group2.xlsx` và các tài liệu dự án có sẵn. Nếu phát hiện thiếu thông tin, nghiệp vụ chưa rõ ràng hoặc không có tài liệu đối chiếu, PHẢI chủ động hỏi Leader để xin thêm tài liệu hoặc xác nhận trực tiếp. Tuyệt đối KHÔNG ĐƯỢC TỰ ĐOÁN hay tự bịa nghiệp vụ.
20. **Quản trị tầng dùng chung & Cấu hình môi trường (Shared & Config Invariants):**
    - Cấu hình Spring Security chỉ có DUY NHẤT 1 file master là `com.localpress.shared.security.SecurityConfig.java` do Leader SV4 làm chủ. Cấm các nhánh thành viên tự tạo thêm file SecurityConfig riêng để tránh lỗi trùng Bean làm crash server.
    - Mật khẩu MySQL trong `application-dev.yml` mặc định là `password`. Tuyệt đối không commit mật khẩu MySQL cá nhân lên git làm hỏng môi trường của người khác.
    - Khóa cổng thanh toán (SePay merchant id, secret key, webhook API key, số tài khoản) KHÔNG được ghi trong `application-dev.yml` hay bất kỳ file nào lên GitHub. Đặt ở `backend/config/application-secrets.yml` (đã `.gitignore`, mẫu: `application-secrets.example.yml`) hoặc biến môi trường `SEPAY_*`.
    - Migration Flyway: V1-V11 đã dùng, giữ nguyên. Migration MỚI đặt số theo thời gian tạo `VyyyyMMddHHmm__mo_ta.sql` (vd: `V202610281530__add_invoice_table.sql`) để hai nhánh không bao giờ trùng số. Pull `main` ngay trước khi tạo migration, merge PR chứa migration sớm. Cấm sửa nội dung hoặc đổi tên migration đã lên `main`; cần thay đổi thì tạo file mới. Profile dev bật `spring.flyway.out-of-order: true` để migration số nhỏ merge về sau vẫn được chạy bù; không bật ở môi trường thật. DB local không đi theo git: không chạy nhánh cũ (thiếu migration) trên DB đã chạy migration mới hơn.
    - Toàn bộ tài khoản seed data trong `seed_data.sql` có mật khẩu mặc định là `password` hoặc `password123` (`SecurityConfig` hỗ trợ linh hoạt cả 2).
    - Ở Frontend, điều hướng sau khi đăng nhập thật bắt buộc dùng `PERMISSION_CHECKERS.getDefaultBackofficeRoute(user.role)`, tuyệt đối không gán cứng URL sang một phân hệ cụ thể.
21. **Quy tắc đồng bộ bộ nhớ kép (Dual-Workspace Memory Sync):** Mọi cập nhật tài liệu ngữ cảnh, quy tắc kiến trúc, quy chuẩn code hoặc bài học ghi nhớ mới BẮT BUỘC phải được ghi và đồng bộ song song vào CẢ 2 NƠI: (1) `E:\FPTU\FALL26\SWP391\AGENTS.md` (Repo gốc) và (2) `E:\FPTU\FALL26\SWP391\huyz4nny\AGENTS.md` (Thư mục làm việc của Leader Huy). Tuyệt đối không để lệch thông tin giữa 2 thư mục này.

---

## 4. BẢN ĐỒ DỮ LIỆU & 19 THỰC THỂ CƠ SỞ DỮ LIỆU (DATABASE INTEGRITY)
Ma trận CRUD trong [`project_tracking_group2.xlsx`](project_tracking_group2.xlsx) theo dõi **19 thực thể cốt lõi**, tương ứng 22 bảng vật lý trong CSDL (cài đặt tại `backend/src/main/resources/db/migration/V1__create_tables.sql`):

### 19 Thực thể trong Ma trận CRUD (`project_tracking_group2.xlsx`):
1. `users`: Tài khoản định danh dùng chung toàn hệ thống (kèm quản lý phiên thiết bị `user_devices`).
2. `categories`: Danh mục tin tức phân cấp cha - con.
3. `category_follows`: Độc giả theo dõi danh mục địa phương.
4. `articles`: Thực thể bài viết gốc (lưu slug, access_type FREE/PREMIUM, published_version). Kèm bảng phụ `tags` & `article_tags`.
5. `article_versions`: Toàn văn bài viết, tiêu đề, sapo, số phiên bản, trạng thái duyệt.
6. `comments`: Bình luận độc giả (trạng thái PENDING, APPROVED, REJECTED).
7. `saved_articles`: Tủ sách độc giả (Bookmark lưu bài & lịch sử đọc).
8. `subscription_plans`: Danh mục gói cước độc giả (tháng, quý, năm, quyền audio, ad-free).
9. `subscriptions`: Gói cước độc giả đã đăng ký (kèm thời hạn, gia hạn tự động).
10. `article_purchases`: Độc giả mua lẻ từng bài viết Premium.
11. `advertisers`: Hồ sơ doanh nghiệp quảng cáo B2B.
12. `ad_slots`: Danh mục vị trí hiển thị banner trên các trang và chuyên mục.
13. `ad_campaigns`: Chiến dịch quảng cáo B2B (ngày bắt đầu, kết thúc, tổng tiền, trạng thái).
14. `ad_creatives`: Banner ảnh, URL đích, phiên bản duyệt của chiến dịch.
15. `ad_stats`: Thống kê lượt hiển thị (impressions), click hợp lệ, click bị lọc gian lận.
16. `transactions`: Đơn hàng thanh toán trung tâm (CHECK constraint chỉ liên kết đúng 1 trong 3 đối tượng: `subscription_id`, `purchase_id`, `campaign_id`).
17. `refund_requests`: Yêu cầu hoàn tiền theo nguyên tắc 4 mắt.
18. `notifications`: Trung tâm thông báo người dùng và doanh nghiệp.
19. `audit_logs`: Nhật ký kiểm toán an ninh hệ thống (ai làm gì, lúc nào, đối tượng nào, lý do).

### Bảng mở rộng của SV4 (Ví LocalPress, `V3__wallet_and_topup.sql`):
- `wallets`: Số dư ví của từng user (UNIQUE `user_id`, CHECK `balance >= 0`).
- `wallet_entries`: Sổ chi tiết ví (CREDIT/DEBIT), UNIQUE(`transaction_id`, `direction`) chống cộng/trừ trùng khi webhook gửi lại.
- `transactions` thêm loại `TOPUP` (nạp ví, không gắn đối tượng nào), cột `description`, `expires_at` (hạn mã QR 15 phút), `payment_method = 'WALLET'` khi trả bằng số dư.
- `payment_complaints` (`V4__payment_complaints.sql`): Khiếu nại "đã chuyển tiền nhưng chưa được ghi nhận" (UC051), UNIQUE `bank_reference` (1 lần chuyển chỉ khiếu nại 1 lần).
- `transactions.topup_for_order` (`V6__topup_for_order.sql`): đơn TOPUP nạp bù ghi mã đơn cần tự trả khi tiền về.
- `sepay_webhook_logs` (`V5__sepay_webhook_logs.sql`): nhật ký mọi khoản tiền SePay báo về (nguồn WEBHOOK / API_SYNC / SIMULATION) kèm payload gốc, UNIQUE `sepay_id` chống xử lý trùng.
- Nạp ví là **công nợ phải trả khách, không phải doanh thu**. Doanh thu chỉ ghi nhận khi khách tiêu ví hoặc trả QR cho đơn hàng (Rule 16). Tiền nạp không rút ra ngân hàng.

---

## 5. HỢP ĐỒNG GIAO TIẾP DÙNG CHUNG (SHARED SERVICE CONTRACTS)
1. **Thanh toán tập trung (`com.localpress.finance`):**
   - Tạo đơn: module nguồn gọi `PaymentProcessingService.createOrder(userId, CreateOrderRequest)` **từ server** (mẫu: `AdBookingService` của SV1), giá lấy từ DB của module, `targetId` là bản ghi chờ đã kiểm tra chủ sở hữu. Frontend chỉ gọi API của module mình (vd `POST /api/v1/advertiser/campaigns/{id}/payment`) rồi nhận `orderCode`. REST `POST /api/v1/finance/orders` (alias `/checkout`) trả **403** khi gọi từ trình duyệt (Rule 4, Rule 14: giá và `targetId` sửa được bằng F12); chỉ mở khi bật `localpress.payment.client-orders-enabled=true` để chạy script E2E của SV4. User lấy từ phiên đăng nhập, không nhận header `X-User-Id`.
   - **Trang thanh toán chung:** tạo đơn xong, module nguồn BẮT BUỘC `navigate(paymentPath(response), { state: { returnUrl } })` (`@/features/finance/api/payment`) sang `/payment/:orderCode` của SV4. Không module nào tự làm trang QR/checkout riêng. **Mọi đơn mua (bài, gói, quảng cáo) đều trả bằng Ví LocalPress** (từ 22/10/2026): ví đủ thì 1 nút trừ ví; ví thiếu thì trang tự tạo mã QR nạp bù đúng phần còn thiếu (`POST /api/v1/finance/orders/code/{code}/shortfall-topup`, đơn TOPUP có `topup_for_order`), SePay báo tiền nạp về thì backend tự trừ ví trả đơn (`tryAutoPay`). Trang hỏi trạng thái 3 giây/lần. Tiền chuyển thẳng vào mã đơn (cách cũ, khiếu nại) vẫn được xử lý.
   - Ví: `GET /api/v1/finance/wallet/me`, `POST /api/v1/finance/wallet/topups`, `POST /api/v1/finance/orders/code/{code}/pay-with-wallet`. Header có `WalletBalanceButton` (số dư + Nạp tiền) -> `/wallet/topup` -> `/payment/:orderCode`.
   - Đơn của tôi: `GET /api/v1/finance/orders/me?type=&page=&size=` trả đơn của user đang đăng nhập (mới nhất trước, `size` tối đa 100, `type` = `SUBSCRIPTION`/`ARTICLE`/`AD`/`TOPUP`/`REFUND`), dạng `ApiResponse<Page<OrderStatusResponse>>`. Mỗi đơn có `targetId` (`purchase_id`/`subscription_id`/`campaign_id`; REFUND là id đơn gốc). SV3 dùng cho UC045 thay vì đọc thẳng bảng `transactions`.
   - Webhook: `POST /api/v1/finance/webhook/sepay` (header `Authorization: Apikey <key>`, sai khóa trả 401) xử lý IPN Idempotent, phát event `PaymentSuccessEvent`. Payload thật của SePay là camelCase (`id`, `transferAmount`, `transferType`, `referenceCode`, `code`); mọi đường tiền vào (webhook, đồng bộ API SePay, giả lập dev) đi qua `SepayGatewayService.receive`, ghi `sepay_webhook_logs`, xử lý xong luôn trả `200 {"success": true}` để SePay không gửi lại. Máy local nhận webhook qua `backend/scripts/sepay-tunnel.ps1` (Cloudflare Quick Tunnel, chỉ dùng khi dev, URL đổi mỗi lần chạy; deploy thật thì dùng tên miền). Đã test tiền thật 22/10/2026: TPBank → SePay → webhook → ví. SePay chỉ gửi webhook cho giao dịch xảy ra sau khi webhook được tạo; không có tunnel thì `localpress.sepay.api-token` cho phép hỏi API SePay (`POST /finance/sepay/sync`, `POST /finance/orders/code/{code}/check-sepay`). Tiền về muộn (booking quảng cáo quá hạn giữ chỗ), chuyển thiếu, chuyển thừa đều được cộng vào ví, không bao giờ treo tiền khách.
   - **Không có duyệt chuyển khoản thủ công.** Kế toán không được tự đánh dấu đơn PAID. Khách đã chuyển tiền mà không được ghi nhận thì gửi khiếu nại ở `/wallet/complaints` (`POST /api/v1/finance/complaints`); kế toán đối chiếu sao kê tại `/backoffice/finance/complaints` rồi Ghi nhận vào đơn (chạy lại đúng hàm xử lý webhook, idempotent), Cộng vào ví, hoặc Từ chối có lý do. UC051 / màn hình II.4.4 (khách) và II.4.6 (kế toán) dùng cho luồng này.
   - SV1/SV3 tự viết `@EventListener PaymentSuccessEvent` trong module của mình để kích hoạt campaign / mở khóa bài / kích hoạt gói. `targetId` phải là id bản ghi thật (`purchase_id`, `subscription_id`, `campaign_id`) do module nguồn tạo ở trạng thái chờ trước khi gọi tạo đơn.
   - **Hoàn tiền (UC055 -> UC056):** Kế toán trưởng duyệt hoàn xong, SV4 chỉ ghi bút toán `REFUND` (đơn trả bằng ví thì hoàn lại vào ví) rồi phát `RefundCompletedEvent` (`com.localpress.shared.event`: `transactionType`, `targetId`, `refundAmount`, `fullRefund`...). SV4 KHÔNG sửa bảng `article_purchases` / `subscriptions` / `ad_campaigns` (Rule 17). SV3 tự viết `@EventListener RefundCompletedEvent` để thu hồi bài / gói, SV1 để tạm dừng chiến dịch; quy định: **hoàn toàn bộ thì thu hồi quyền, hoàn một phần thì khách giữ quyền** (listener chỉ thu hồi khi `shouldRevokeRights()` = `fullRefund` = true).
   - **Nhắc nợ quảng cáo (UC053):** SV4 lưu `receivable_reminders` rồi phát `ReceivableReminderEvent` (`com.localpress.shared.event`: `campaignId`, `advertiserId`, `amountDue`, `dueDate`, `overdueDays`, `note`). SV1 tự viết `@EventListener` để báo doanh nghiệp; SV4 không ghi `notifications` / `ad_campaigns` (Rule 17).
   - **Kế toán trưởng (mắt 2, chốt kỳ đối soát):** ở API thật là tài khoản `SYSTEM_ADMIN` (`FinanceCurrentUser.requireFinanceManager`), vai trò khác nhận 403; `FINANCE_MANAGER` chỉ có ở mock frontend. SV4 không tự thêm giá trị vào `users.role`.
2. **Cổng bảo vệ nội dung (`com.localpress.delivery` & `reader`):**
   - Kiểm tra: `PaywallEngine.checkAccess(userId, articleId)` trước khi trả dữ liệu bài viết.
3. **Phê duyệt quảng cáo (`com.localpress.advertising` & `editorial`):**
   - Khi upload banner mới, trạng thái là `PENDING_REVIEW`, xuất hiện tại trang duyệt của SV2.
4. **Phân phối banner (`com.localpress.delivery`):**
   - `GET /api/v1/delivery/ad-slots/{slotCode}/serve` trả banner ngẫu nhiên có trọng số trong số các creative đã `APPROVED` và hợp đồng còn hạn.

---

## 6. SỔ TAY DEMO BẢO VỆ ĐỒ ÁN (10 DEFENSE SCENARIOS)
Khi bảo vệ trước Hội đồng FPT, hãy tự tin thực hiện 10 kịch bản demo:
1. Mở cửa sổ ẩn danh (Guest) đọc bài Free bình thường; mở bài Premium chỉ thấy tóm tắt 30%, bấm F12 không thấy full text trong HTML.
2. Reader mua bài lẻ 15.000 ₫ $\rightarrow$ Chuyển sang trang thanh toán chung `/payment/:orderCode` $\rightarrow$ Quét mã QR SePay (hoặc trả bằng Ví LocalPress) $\rightarrow$ Backend nhận Webhook mở khóa ngay; bắn lại Webhook lần 2 hệ thống báo `ALREADY_PROCESSED` không cộng trùng. Biến thể: nạp ví từ nút "Nạp tiền" trên header, chuyển thiếu thì tiền vào ví, đơn vẫn chờ.
3. Mở 2 trình duyệt cho 2 doanh nghiệp cùng lúc chọn 1 slot độc quyền cùng ngày $\rightarrow$ Chỉ 1 doanh nghiệp đặt thành công, người thứ hai nhận thông báo slot vừa được giữ chỗ.
4. Doanh nghiệp thay đổi ảnh banner đang chạy $\rightarrow$ Giao diện độc giả vẫn hiện ảnh cũ cho đến khi Ban biên tập (SV2) bấm "Duyệt bản mới".
5. Ban biên tập bấm "Tạm dừng khẩn cấp" một banner $\rightarrow$ Ngay lập tức trang chủ không còn hiển thị banner đó.
6. Độc giả bình luận được duyệt hiển thị $\rightarrow$ Độc giả bấm sửa comment $\rightarrow$ Comment lập tức biến mất khỏi trang công khai và quay về danh sách chờ duyệt của Moderator.
7. Kế toán thực hiện hoàn tiền cho đơn lỗi $\rightarrow$ Trạng thái chuyển `REFUNDED`, quyền đọc bài bị thu hồi, báo cáo doanh thu trừ đúng số tiền hoàn.
8. Phóng viên soạn bài, bấm AI Gợi ý tiêu đề $\rightarrow$ AI sinh 3 tiêu đề $\rightarrow$ Phóng viên chọn, sửa lại rồi mới nộp duyệt cho Tổng biên tập.
9. Tắt mạng hoặc giả lập cổng thanh toán timeout $\rightarrow$ Hệ thống hiển thị trạng thái đang xử lý và cho phép kiểm tra lại giao dịch mà không bắt người dùng trả tiền lại.
10. Doanh nghiệp A sửa ID trên URL sang ID chiến dịch của Doanh nghiệp B $\rightarrow$ Backend trả về lỗi `403 Forbidden` (Bảo mật Multi-tenant).

---

## 7. QUY CHUẨN FRONTEND & WORKSPACE SKILL (`localpress-frontend`)
Toàn bộ mã nguồn giao diện (Frontend) của 5 thành viên được đồng bộ hóa và quản trị qua **Workspace Skill `localpress-frontend`** (đặt tại `.agents/skills/localpress-frontend/SKILL.md`). Khi phát triển màn hình hoặc component mới, AI Agents và lập trình viên phải tuân thủ:

1. **Hệ thống thiết kế (Design Tokens):**
   - Màu chủ đạo: Deep Navy `#1e3a8a` (`bg-primary-900`), Đỏ thời sự Crimson `#991b1b` (`bg-crimson`), Vàng Hội Viên Gold `#d97706` (`bg-gold`), Nền báo giấy ngà `#fafaf9` (`PublicLayout`).
   - Phông chữ: `font-serif` (Merriweather) cho Tên báo, Tiêu đề bài viết và Sapo; `font-sans` (Inter) cho Backoffice, bảng biểu và form.
   - Định dạng: Bắt buộc dùng `@/lib/format` cho tiền tệ (`formatCurrency` VND) và ngày giờ (`formatDateTime`, `formatRelativeTime` theo giờ Việt Nam).
2. **Phân chia 4 Layout chuẩn mực:**
   - `PublicLayout`: Trang báo công khai cho Khách vãng lai (`GUEST`) & Độc giả (SV3).
   - `ReaderAccountLayout`: Cổng tài khoản độc giả (Tủ sách, Gói cước, 2 thiết bị) (SV3).
   - `AdvertiserLayout`: Cổng doanh nghiệp B2B (Tra cứu slot, đặt booking, xem CTR) (SV1).
   - `BackofficeLayout`: Cổng quản trị Tòa soạn (SV2), Kế toán (SV4), Quản trị hệ thống (SV5).
3. **Thư viện Component tái sử dụng:**
   - `StatusBadge`: Bắt buộc dùng cho mọi trạng thái (`article`, `booking`, `payment`, `delivery`, `creative`, `refund`).
   - `EmptyState` & `ConfirmDialog`: Dùng cho trạng thái rỗng và xác nhận thao tác nhạy cảm.
   - `Button`, `Badge`, `Card`, `Input`, `Label`: Dùng từ `@/components/ui/`.
4. **Quy chuẩn Form & API Dual-Mode:**
   - Form nhập liệu dùng `react-hook-form` kết hợp `zod` schema hiển thị lỗi tiếng Việt.
   - API client đặt tại `src/features/<module>/api/index.ts` hỗ trợ song song Mock Store (`mockStore`) và Backend Spring Boot qua `APP_CONFIG.useMockApi`.
5. **Mẫu tham chiếu nhanh:** Xem chi tiết tại `.agents/skills/localpress-frontend/references/` và các code mẫu trong `.agents/skills/localpress-frontend/examples/`.
6. **Skill thẩm mỹ `taste-skill`** (`.agents/skills/taste-skill/`, nguồn github.com/leonxlnx/taste-skill): màn hình backoffice/kế toán theo `references/app-screens.md`, style `achromatic-ledger` (giữ màu & phông brand ở mục 1). Token dùng chung nằm ở `tailwind.config.js`: `slate` là xám trung tính, không shadow cho vật đứng yên (chỉ `shadow-lg/xl/2xl` cho dialog, menu), bo góc 8px panel / 6px control, `bg-ground` là nền backoffice. Không gradient, không icon trong ô màu trên KPI, không nhãn chữ hoa giãn chữ, số tiền canh phải bằng `num`/`tabular-nums`. Kiểm tra bằng `node .agents/skills/taste-skill/scripts/lint.mjs --app <thư mục>`. Primitive kế toán: `src/features/finance/components/LedgerUI.tsx`.
7. **Dark mode toàn site:** class `dark` trên `<html>` (nút `components/shared/ThemeToggle.tsx` có ở cả 4 layout, script chống nháy trong `index.html`). `slate`/`stone`/`ground`/`positive`/`negative` là biến CSS; ghi đè `bg-white`, nền nhạt và chữ màu đậm cho dark nằm trong khối THEME của `styles/globals.css`, sinh bởi `frontend/scripts/gen_theme_css.py` (sửa màu ở script rồi chạy lại, không sửa tay khối THEME). Trang mới không cần viết `dark:` nếu dùng `slate-*`, `bg-white`, `bg-ground`.

---

## 8. CẨM NANG REVIEW & PHÒNG THI (`iter-review`)
> Cẩm nang review Iter 1-2 của SV4 (từng màn hình, từng nút → code → DB, bài sửa tại chỗ): `docs/sv4/01_output/REVIEW_ITER_1_2.md`; ảnh theo luồng: `docs/sv4/01_output/screenshots/`.
> Tài liệu SV4 (swimlane, use case, thay đổi DB) nằm ở `docs/sv4/` (`01_output` = file dùng để nộp/review, `02_source` = PlantUML, `03_tools` = script render).
Toàn bộ kịch bản Review cá nhân 1-1 trên lớp với Giảng viên được hệ thống hóa qua **Workspace Skill `iter-review`** (đặt tại `.agents/skills/iter-review/SKILL.md`). Skill này cung cấp:
1. **Bảng Mapping toàn diện:** Tra cứu tức thì từ Use Case (`UC001` - `UC077`) sang URL Route ("mở link nào"), Frontend Page/Component, Backend Controller/Service, và Bảng CSDL.
2. **Kịch bản điều hướng theo vai trò:** Trình tự demo từng bước trên giao diện (Kế toán SV4 duyệt chuyển khoản & kiểm soát sổ cái, Doanh nghiệp SV1 đặt vị trí, Độc giả SV3 đọc báo Free/Paywall, CMS SV5 soạn bài).
3. **Cẩm nang sửa code logic (Live-coding):** Vị trí chính xác từng file và cách sửa nhanh khi giảng viên yêu cầu sửa tại chỗ (validate dữ liệu, lưu lý do từ chối, kiểm soát quy tắc 4 mắt, lọc sổ quỹ theo khoảng tiền, format hiển thị).
4. **Chiến thuật Honeypot Baiting (Gài bẫy có chủ đích):** Kỹ thuật chủ động hé lộ điểm nghi vấn có tính toán (không dùng OCR đọc bill, quy tắc 4 mắt, scalar foreign key `Long userId`, decoupled domain events) để dẫn dắt giảng viên hỏi trúng vào thế mạnh kiến trúc và ghi điểm phản biện tối đa.
5. **Khung Review Màn hình Toàn diện (Full-Screen Breakdown):** Phương pháp mổ xẻ 3 lớp kiến trúc của bất kỳ màn hình nào: (1) Khung Layout ngoài cùng (`BackofficeLayout.tsx`), (2) Chi tiết nội dung trang bên trong (`OrderListPage.tsx`), (3) Trace đường đi của code khi click từng nút cụ thể (Chi tiết, Duyệt PAID, In hóa đơn UC057).
6. **Bắt buộc chứng minh bằng Database (DB Proof) — áp dụng cho cả 5 thành viên:** Mọi luồng đem ra review phải sẵn sàng mở MySQL (`localpress_db`, MySQL Workbench hoặc `mysql` CLI) ngay tại chỗ để chỉ ra: (1) bấm nút đó thì **INSERT / UPDATE / DELETE dòng nào ở bảng nào**, (2) **giá trị cột trước và sau** khi bấm (chạy cùng 1 câu `SELECT` trước và sau), (3) **ràng buộc DB nào chặn dữ liệu sai** (`UNIQUE`, `CHECK`, `FOREIGN KEY ... ON DELETE RESTRICT`) bằng cách thử thao tác sai và cho xem lỗi. Phải chuẩn bị sẵn câu SQL cho từng nút của màn hình mình phụ trách, không được trả lời "chắc là có lưu". Với dữ liệu tiền (SV4) **không bao giờ xóa cứng**: "hủy / từ chối / hoàn" là đổi `status` hoặc ghi bút toán đảo, và phải chỉ được điều đó trong DB. Câu SQL mẫu của SV4: mục 7 trong `.agents/skills/iter-review/SKILL.md`.

