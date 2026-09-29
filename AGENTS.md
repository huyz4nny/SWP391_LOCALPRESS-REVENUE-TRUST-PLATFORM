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
Dự án gồm **5 sinh viên**, mỗi sinh viên làm chủ trọn vẹn 1 luồng nghiệp vụ end-to-end (Frontend + Backend + DB logic) gồm **25 chức năng** (tổng cộng **125 chức năng** trong danh mục chuẩn `LocalPress_Danh_muc_chuc_nang.xlsx`):

| Thành viên | Luồng nghiệp vụ | Phân hệ chính | Phạm vi chức năng (25 CN / người) |
| :--- | :--- | :--- | :--- |
| **SV4: Huy (Leader)** | **Luồng Kế toán, Thanh toán & Đối soát** | `finance`, `transactions`, `refund_requests` | 12 P0, 12 P1, 1 P2. Bộ xử lý thanh toán dùng chung, Webhook IPN, hóa đơn/chứng từ, sổ quỹ kép, đối soát ngân hàng, hoàn tiền 4 mắt. |
| **SV1: Tây** | **Luồng Doanh nghiệp (Advertiser Portal)** | `advertising`, `advertisers`, `ad_campaigns` | 16 P0, 9 P1, 0 P2. Cổng B2B, tra cứu slot trống, gửi booking, upload creative, xem báo cáo hiệu suất CTR, quản lý hồ sơ & chứng từ B2B. |
| **SV2: Trọng Phan** | **Luồng Tòa soạn, Vận hành & Phê duyệt** | `editorial`, duyệt bài, duyệt ad, duyệt comment | 14 P0, 8 P1, 3 P2. Dashboard kinh doanh tòa soạn, duyệt báo giá/hợp đồng, kiểm duyệt banner, kiểm duyệt bài viết, kiểm duyệt comment, quản lý gói đọc. |
| **SV3: Hoàng** | **Luồng Khách & Độc giả (Reader Experience)** | `reader`, `articles` (public), `subscriptions` | 18 P0, 6 P1, 1 P2. Đọc báo Free 100%, preview Paywall, giỏ hàng/checkout gói & bài lẻ, tủ sách cá nhân, bookmark/follow, quản lý phiên tối đa 2 thiết bị. |
| **SV5: Tùng** | **Luồng Hệ thống, Paywall, Ad Serving & AI** | `delivery`, `content` CMS, `administration`, AI | 17 P0, 7 P1, 1 P2. CMS soạn bài & phiên bản, Paywall Engine ở máy chủ, Ad Serving Engine chống gian lận click, cấu hình slot, trợ lý AI biên tập, audit logs. |

---

## 3. 16 QUY TẮC NGHIỆP VỤ BẤT BIẾN (INVARIANT BUSINESS RULES)
Bất kỳ mã nguồn hoặc cấu trúc API nào được tạo ra **BẮT BUỘC PHẢI TUÂN THỦ 16 QUY TẮC SAU**:

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

---

## 4. BẢN ĐỒ DỮ LIỆU & 19 BẢNG CƠ SỞ DỮ LIỆU (DATABASE INTEGRITY)
Hệ thống gồm 19 bảng liên kết chặt chẽ (được cài đặt trong `backend/src/main/resources/db/migration/`):

1. `users`: Tài khoản định danh dùng chung toàn hệ thống.
2. `categories`: Danh mục tin tức phân cấp cha - con.
3. `category_follows`: Độc giả theo dõi danh mục.
4. `tags` & `article_tags`: Gắn nhãn bài viết theo chuyên đề.
5. `articles`: Thực thể bài viết gốc (lưu slug, access_type FREE/PREMIUM, published_version).
6. `article_versions`: Toàn văn bài viết, tiêu đề, sapo, phiên bản, trạng thái duyệt.
7. `comments`: Bình luận độc giả (có trường trạng thái duyệt PENDING, APPROVED, REJECTED).
8. `saved_articles`: Tủ sách độc giả (Bookmark).
9. `reading_history`: Lịch sử đọc bài của độc giả.
10. `user_devices`: Quản lý phiên thiết bị của độc giả (giới hạn tối đa 2 thiết bị đồng thời).
11. `subscription_plans`: Danh mục gói cước độc giả (tháng, quý, năm, quyền audio, quyền ad-free).
12. `subscriptions`: Gói cước độc giả đã đăng ký (kèm thời hạn, trạng thái gia hạn).
13. `article_purchases`: Độc giả mua lẻ từng bài viết Premium.
14. `advertisers`: Hồ sơ doanh nghiệp quảng cáo B2B.
15. `ad_slots`: Danh mục vị trí hiển thị banner trên các trang và chuyên mục.
16. `ad_campaigns`: Chiến dịch quảng cáo của doanh nghiệp (ngày bắt đầu, kết thúc, tổng tiền, trạng thái).
17. `ad_creatives`: Banner ảnh, URL đích, phiên bản duyệt của chiến dịch.
18. `ad_stats`: Thống kê lượt hiển thị (impressions), click hợp lệ, click bị lọc.
19. `transactions`: Đơn hàng thanh toán trung tâm (CHECK constraint chỉ liên kết đúng 1 trong 3 đối tượng: `subscription_id`, `purchase_id`, `campaign_id`).
20. `refund_requests`: Yêu cầu hoàn tiền theo nguyên tắc 4 mắt.
21. `notifications`: Trung tâm thông báo người dùng và doanh nghiệp.
22. `audit_logs`: Nhật ký kiểm toán an ninh hệ thống (ai làm gì, lúc nào, đối tượng nào, lý do).

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
