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
| **SV4: Huy (Leader)** | **Kế toán, Thanh toán & Đối soát** | `finance`, `transactions`, `refund_requests` | **14 Use Cases (`UC047` - `UC060`)**, **8 Màn hình / Chức năng** (SRS/SDS II.4.1 - II.4.8). Sắp xếp theo: Iter 1 (2), Iter 2 (2), Iter 3 (4). | 25 tiêu chí (12 P0, 12 P1, 1 P2): Bộ xử lý thanh toán dùng chung, Webhook IPN, hóa đơn/chứng từ, sổ quỹ kép, đối soát ngân hàng, hoàn tiền 4 mắt. |
| **SV1: Tây** | **Doanh nghiệp (Advertiser Portal)** | `advertising`, `advertisers`, `ad_campaigns` | **14 Use Cases (`UC001` - `UC014`)**, **10 Màn hình / Chức năng** (SRS/SDS II.1.1 - II.1.10). Sắp xếp theo: Iter 1 (2), Iter 2 (4), Iter 3 (4). | 25 tiêu chí (16 P0, 9 P1, 0 P2): Cổng B2B, tra cứu slot trống, gửi booking, upload creative, xem báo cáo hiệu suất CTR, hồ sơ & chứng từ B2B. |
| **SV2: Trọng Phan** | **Tòa soạn, Vận hành & Phê duyệt** | `editorial`, duyệt bài, duyệt ad, duyệt comment | **14 Use Cases (`UC015` - `UC028`)**, **10 Màn hình / Chức năng** (SRS/SDS II.2.1 - II.2.10). Sắp xếp theo: Iter 1 (2), Iter 2 (4), Iter 3 (4). | 25 tiêu chí (14 P0, 8 P1, 3 P2): Dashboard kinh doanh tòa soạn, duyệt báo giá/hợp đồng, kiểm duyệt banner, kiểm duyệt bài viết, kiểm duyệt comment, quản lý gói đọc. |
| **SV3: Hoàng** | **Khách & Độc giả (Reader Experience)** | `reader`, `articles` (public), `subscriptions` | **18 Use Cases (`UC029` - `UC046`)**, **10 Màn hình / Chức năng** (SRS/SDS II.3.1 - II.3.10). Sắp xếp theo: Iter 1 (3), Iter 2 (4), Iter 3 (3). | 25 tiêu chí (18 P0, 6 P1, 1 P2): Đọc báo Free 100%, preview Paywall, giỏ hàng/checkout gói & bài lẻ, tủ sách cá nhân, bookmark/follow, quản lý 2 thiết bị. |
| **SV5: Tùng** | **Hệ thống, Paywall, Ad Serving & AI** | `delivery`, `content` CMS, `administration`, AI | **17 Use Cases (`UC061` - `UC077`)**, **10 Màn hình / Chức năng** (SRS/SDS II.5.1 - II.5.10). Sắp xếp theo: Iter 1 (2), Iter 2 (3), Iter 3 (5). | 25 tiêu chí (17 P0, 7 P1, 1 P2): CMS soạn bài & phiên bản, Paywall Engine ở máy chủ, Ad Serving Engine chống gian lận click, cấu hình slot, trợ lý AI biên tập, audit logs. |

### Lộ trình 3 Đợt triển khai theo Activity Flow (Đầu $\rightarrow$ Giữa $\rightarrow$ Cuối quy trình):
* **Iteration 1 — Đầu quy trình (11 màn hình):** Ingestion, Setup, Master Data, Đọc Free & Soạn bài cơ bản.
  * SV1: `Company Profile`, `Ad Slot Catalog`
  * SV2: `Article Review and Publishing`, `Content Policy and Moderation`
  * SV3: `Homepage and Article Search`, `Article Reader`, `Authentication`
  * SV4: `Financial Documents and Ledger`, `Manual Bank Transfer Confirmation`
  * SV5: `Article Editor`, `Article Metadata and Media`
* **Iteration 2 — Giữa quy trình (17 màn hình):** Giao dịch lõi, Thanh toán QR/IPN, Paywall Server-side, Booking & Duyệt banner.
  * SV1: `Campaign Booking`, `Quotation Confirmation`, `Advertising Payment`, `Creative Submission and Preview`
  * SV2: `Pending Booking Queue`, `Advertising Inventory Calendar`, `Quotation Management`, `Creative Review`
  * SV3: `Premium Checkout`, `Premium Article Reader`, `Personal Bookshelf`, `Comments and Reports`
  * SV4: `Payment Processing`, `Advertiser Receivables`
  * SV5: `Article Version History`, `Article Submission and Revision`, `Content Access and Paywall`
* **Iteration 3 — Cuối quy trình (20 màn hình):** Đối soát, Hoàn tiền 4 mắt, Báo cáo & Dashboard, AI Cố vấn, Ad Serving & Admin.
  * SV1: `Advertising Dashboard`, `Creative Replacement`, `Requests and Business Notifications`, `Contracts and Documents`
  * SV2: `Campaign Eligibility Check`, `Campaign Control`, `Advertising Contract Management`, `Business Operation Dashboard`
  * SV3: `Followed Content`, `Devices and Sessions`, `Subscription, Transactions and Support`
  * SV4: `Cash Flow Dashboard`, `Payment Reconciliation`, `Refund and Rights Management`, `Financial Reports and Alerts`
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
18. **Phong cách giao tiếp với Leader (Communication Tone):** Trao đổi ngắn gọn, thực tế, đúng phong cách anh em trong đội làm đồ án. Tuyệt đối không dùng icon, emoji màu mè, không văn vở hoa mỹ. Luôn giữ vai trò Technical Lead / Master Reviewer hỗ trợ Leader rà soát code các thành viên để chống conflict và bảo vệ kiến trúc.
19. **Nguyên tắc "Đọc kỹ AGENTS.md, thiếu thì hỏi xin tài liệu, cấm tự đoán" (Strict Verification):** Trước khi phân tích, viết code hay đánh giá bất kỳ chức năng nào, bắt buộc phải tra cứu kỹ trong `AGENTS.md`, `project_tracking_group2.xlsx` và các tài liệu dự án có sẵn. Nếu phát hiện thiếu thông tin, nghiệp vụ chưa rõ ràng hoặc không có tài liệu đối chiếu, PHẢI chủ động hỏi Leader để xin thêm tài liệu hoặc xác nhận trực tiếp. Tuyệt đối KHÔNG ĐƯỢC TỰ ĐOÁN hay tự bịa nghiệp vụ.
20. **Quản trị tầng dùng chung & Cấu hình môi trường (Shared & Config Invariants):**
    - Cấu hình Spring Security chỉ có DUY NHẤT 1 file master là `com.localpress.shared.security.SecurityConfig.java` do Leader SV4 làm chủ. Cấm các nhánh thành viên tự tạo thêm file SecurityConfig riêng để tránh lỗi trùng Bean làm crash server.
    - Mật khẩu MySQL trong `application-dev.yml` mặc định là `password`. Tuyệt đối không commit mật khẩu MySQL cá nhân lên git làm hỏng môi trường của người khác.
    - Toàn bộ tài khoản seed data trong `seed_data.sql` có mật khẩu mặc định là `password` (mã băm BCrypt chuẩn).
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

---

## 5. HỢP ĐỒNG GIAO TIẾP DÙNG CHUNG (SHARED SERVICE CONTRACTS)
1. **Thanh toán tập trung (`com.localpress.finance`):**
   - API: `POST /api/v1/finance/orders` tạo đơn thanh toán dùng chung cho cả Mua báo (SV3) và Quảng cáo (SV1).
   - Webhook: `POST /api/v1/finance/webhook/{gateway}` xử lý IPN Idempotent, phát event `PaymentSuccessEvent`.
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
2. Reader mua bài lẻ 15.000 ₫ $\rightarrow$ Quét mã QR thanh toán $\rightarrow$ Backend nhận Webhook mở khóa ngay; bắn lại Webhook lần 2 hệ thống báo `ALREADY_PROCESSED` không cộng trùng.
3. Mở 2 trình duyệt cho 2 doanh nghiệp cùng lúc chọn 1 slot độc quyền cùng ngày $\rightarrow$ Chỉ 1 doanh nghiệp đặt thành công, người thứ hai nhận thông báo slot vừa được giữ chỗ.
4. Doanh nghiệp thay đổi ảnh banner đang chạy $\rightarrow$ Giao diện độc giả vẫn hiện ảnh cũ cho đến khi Ban biên tập (SV2) bấm "Duyệt bản mới".
5. Ban biên tập bấm "Tạm dừng khẩn cấp" một banner $\rightarrow$ Ngay lập tức trang chủ không còn hiển thị banner đó.
6. Độc giả bình luận được duyệt hiển thị $\rightarrow$ Độc giả bấm sửa comment $\rightarrow$ Comment lập tức biến mất khỏi trang công khai và quay về danh sách chờ duyệt của Moderator.
7. Kế toán thực hiện hoàn tiền cho đơn lỗi $\rightarrow$ Trạng thái chuyển `REFUNDED`, quyền đọc bài bị thu hồi, báo cáo doanh thu trừ đúng số tiền hoàn.
8. Phóng viên soạn bài, bấm AI Gợi ý tiêu đề $\rightarrow$ AI sinh 3 tiêu đề $\rightarrow$ Phóng viên chọn, sửa lại rồi mới nộp duyệt cho Tổng biên tập.
9. Tắt mạng hoặc giả lập cổng thanh toán timeout $\rightarrow$ Hệ thống hiển thị trạng thái đang xử lý và cho phép kiểm tra lại giao dịch mà không bắt người dùng trả tiền lại.
10. Doanh nghiệp A sửa ID trên URL sang ID chiến dịch của Doanh nghiệp B $\rightarrow$ Backend trả về lỗi `403 Forbidden` (Bảo mật Multi-tenant).
