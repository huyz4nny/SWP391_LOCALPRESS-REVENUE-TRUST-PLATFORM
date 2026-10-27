# TỔNG QUAN HỆ THỐNG LOCALPRESS — REVENUE & TRUST PLATFORM
> **Dự án:** LocalPress — Revenue & Trust Platform (Báo điện tử địa phương: Doanh thu kép & Kiểm duyệt tin tức)  
> **Môn học:** SWP391 — Học kỳ FALL 2026 — Đại học FPT  
> **Nhóm thực hiện:** Nhóm 2 (Leader: SV4 — Huy)  
> **Tài liệu chuẩn bị cho:** NotebookLM Nghiên cứu & Trợ lý Tri thức Dự án

---

## 1. BỐI CẢNH THỰC TIỄN & SỰ CẤP THIẾT CỦA ĐỀ TÀI

### 1.1. Thực trạng các cơ quan báo chí địa phương
Hiện nay tại Việt Nam, các cơ quan báo chí cấp tỉnh/thành phố (lấy bối cảnh nghiên cứu điển hình: TP. Hải Phòng — đô thị loại 1, trung tâm công nghiệp cảng biển và logistics phía Bắc) đang đối mặt với những thách thức mang tính sống còn:
1. **Áp lực tự chủ tài chính:** Ngân sách bao cấp từ cơ quan nhà nước dần cắt giảm theo lộ trình chuyển đổi cơ chế tự chủ tài chính (Nghị định 60/2021/NĐ-CP). Báo địa phương buộc phải tự tìm nguồn thu bền vững để nuôi bộ máy vận hành và đội ngũ phóng viên.
2. **Sự chi phối của các nền tảng xuyên biên giới:** Doanh nghiệp địa phương chuyển phần lớn ngân sách quảng cáo sang các nền tảng Big Tech như Facebook, Google do tính thuận tiện, đo lường nhanh và tự phục vụ. Các báo tỉnh thiếu một cổng dịch vụ quảng cáo tự phục vụ (Self-serve Ads Portal) minh bạch về vị trí, số liệu và hóa đơn.
3. **Thách thức giữ chân độc giả số:** Độc giả hiện nay có thói quen tiếp nhận thông tin đa kênh nhưng cũng bị bủa vây bởi tin giả (fake news), thông tin giật gân, thiếu kiểm chứng trên mạng xã hội. Nhu cầu về các bài viết điều tra chuyên sâu, phóng sự độc quyền phân tích chính sách kinh tế - xã hội địa phương là rất lớn, nhưng báo chí chưa có cơ chế bảo vệ bản quyền và thu phí nội dung (Paywall) hiệu quả.

### 1.2. Giải pháp LocalPress — Mô hình Doanh thu kép & Kiểm duyệt tin cậy
**LocalPress** được thiết kế như một nền tảng tòa soạn số toàn diện giải quyết triệt để 2 bài toán lớn: **DOANH THU (Revenue)** và **UY TÍN (Trust)**:

```
                      ┌────────────────────────────────────────┐
                      │               LOCALPRESS               │
                      │       Revenue & Trust Platform         │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
   ┌─────────────▼─────────────┐                   ┌─────────────▼─────────────┐
   │    DOANH THU KÉP (REVENUE)│                   │   UY TÍN TÒA SOẠN (TRUST) │
   ├───────────────────────────┤                   ├───────────────────────────┤
   │ 1. B2B: Quảng cáo tự phục │                   │ 1. Kiểm duyệt bài viết    │
   │    vụ (Self-serve Ads)    │                   │    nhiều phiên bản (CMS)  │
   │ 2. B2C: Thu phí nội dung  │                   │ 2. Kiểm duyệt banner B2B  │
   │    chuyên sâu (Paywall)   │                   │ 3. Kiểm duyệt bình luận   │
   │ 3. Cổng thanh toán VietQR │                   │ 4. AI Cố vấn (Human-in-   │
   │    dùng chung tập trung   │                   │    the-Loop, không tự ý)  │
   └───────────────────────────┘                   └───────────────────────────┘
```

---

## 2. HAI TRỤ CỘT DOANH THU (HYBRID REVENUE MODEL)

### 2.1. Trụ cột B2B: Cổng Quảng cáo Tự phục vụ Doanh nghiệp (Advertiser Self-Serve Portal)
* **Đối tượng:** Doanh nghiệp sản xuất, bất động sản, logistics, bán lẻ, dịch vụ tại địa phương.
* **Quy trình tự phục vụ minh bạch:**
  1. Doanh nghiệp tra cứu danh mục vị trí quảng cáo (`ad_slots`) kèm kích thước, hình ảnh vị trí mẫu trên giao diện báo giấy số, đơn giá niêm yết theo ngày.
  2. Kiểm tra lịch trống (`availability calendar`) theo thời gian thực và thực hiện giữ chỗ tạm thời (khóa slot 15-30 phút).
  3. Tải lên tệp ảnh banner (Creative) đúng quy chuẩn kỹ thuật và khai báo liên kết đích (URL).
  4. Thanh toán trực tuyến qua quét mã VietQR tự động hoặc ký hợp đồng bảo lãnh công nợ.
  5. Đội ngũ tòa soạn (Ad Reviewer) kiểm duyệt nội dung banner và quét URL đích trước khi cho phép kích hoạt.
  6. Doanh nghiệp theo dõi báo cáo hiệu quả chiến dịch minh bạch từng ngày: Số lượt hiển thị (Impressions), Số lượt click hợp lệ (Valid Clicks), Tỷ lệ CTR (Click-Through Rate). Hệ thống tích hợp bộ lọc chống gian lận click tặc (Anti-Fraud Click Filter) để bảo vệ ngân sách nhà quảng cáo.

### 2.2. Trụ cột B2C: Thu phí Nội dung Chuyên sâu (Reader Premium Paywall)
* **Đối tượng:** Cán bộ công chức, nhà đầu tư, trí thức, người dân địa phương quan tâm đến tin tức uy tín và các bài điều tra độc quyền.
* **Chính sách tiếp cận đa tầng:**
  * **Đọc Free 100% không bắt ép đăng nhập:** Toàn bộ tin thời sự dân sinh, thông tin cảnh báo, chỉ đạo điều hành của tỉnh được mở miễn phí hoàn toàn cho Khách vãng lai (Guest). Tuyệt đối không chặn popup ép tạo tài khoản.
  * **Preview Server-Side:** Với các bài phóng sự điều tra chuyên sâu (Premium Content), hệ thống chỉ trả về 30% nội dung mở đầu từ máy chủ (Server-side Paywall). 70% nội dung còn lại hoàn toàn không nằm trong mã HTML hay phản hồi JSON để ngăn chặn việc soi mã nguồn (F12 Inspect).
  * **Cơ chế trả tiền linh hoạt:** Độc giả có thể chọn mua lẻ từng bài viết (Micro-payment, ví dụ: 15.000 ₫/bài qua quét mã VietQR nhận quyền tức thì) hoặc mua các gói hội viên định kỳ (tháng, quý, năm) với các quyền lợi vượt trội: đọc toàn bộ phóng sự độc quyền, trải nghiệm không có quảng cáo (Ad-Free), nghe bài viết bằng giọng đọc truyền cảm AI (TTS Audio), tặng bài viết cho bạn bè.
  * **Kiểm soát phiên đăng nhập:** Giới hạn tối đa 2 thiết bị đăng nhập đồng thời trên một tài khoản độc giả để chống chia sẻ tài khoản trái phép.

---

## 3. HỆ THỐNG 11 VAI TRÒ TÁC NHÂN (ACTORS & RBAC)

Hệ thống LocalPress thiết lập ranh giới quyền hạn nghiêm ngặt phục vụ 11 nhóm tác nhân:

| STT | Tác nhân (Actor) | Ranh giới quyền hạn & Nghiệp vụ cốt lõi |
| :---: | :--- | :--- |
| **1** | **Guest** (Khách vãng lai) | Đọc toàn bộ bài viết Free; xem chuyên mục; tìm kiếm tin tức; xem preview 30% bài Premium; xem các bình luận đã được duyệt. Không bị ép đăng nhập. |
| **2** | **Reader** (Độc giả có tài khoản) | Thừa hưởng quyền của Guest; sở hữu Tủ sách cá nhân (Bookmark bài viết, Lịch sử đọc, Theo dõi chuyên mục địa phương); gửi bình luận (chờ duyệt); mua bài lẻ và mua gói; quản lý 2 thiết bị đăng nhập. |
| **3** | **Reader Premium** (Độc giả trả phí) | Đọc toàn văn các bài Premium trong phạm vi quyền đã mua; trải nghiệm đọc không quảng cáo (Ad-Free); nghe audio bài viết; tặng bài viết theo hạn mức gói. |
| **4** | **Advertiser** (Nhà quảng cáo) | Đăng ký hồ sơ doanh nghiệp, mã số thuế; tra cứu vị trí slot trống; đặt booking; nộp banner; thanh toán đơn; xem báo cáo CTR minh bạch; cách ly dữ liệu Multi-tenant. |
| **5** | **Ad Sales** (Kinh doanh quảng cáo) | Tiếp nhận yêu cầu quảng cáo; lập báo giá, quản lý hợp đồng thương mại; đặt booking hộ khách hàng qua điện thoại; theo dõi doanh số và công nợ cùng bộ phận Kế toán. |
| **6** | **Ad Reviewer** (Kiểm duyệt quảng cáo) | Kiểm tra nội dung banner, quy chuẩn kỹ thuật, quét an toàn URL đích; phê duyệt (`APPROVED`) hoặc từ chối kèm lý do; kiểm duyệt phiên bản mới khi doanh nghiệp thay banner. |
| **7** | **Reporter / Writer** (Phóng viên) | Soạn thảo bài viết trên hệ thống CMS Rich Text; đính kèm hình ảnh media; sử dụng trợ lý AI gợi ý tiêu đề/sapo/tag; nộp bài chờ biên tập; sửa bài theo yêu cầu. |
| **8** | **Managing Editor** (Tổng biên tập / Trưởng ban) | Phê duyệt bài viết, yêu cầu sửa đổi; quyết định xuất bản bài viết lên trang (`PUBLISHED`); xác lập chính sách bài là FREE hay PREMIUM và gắn giá bán lẻ bài viết. |
| **9** | **Moderator** (Kiểm duyệt cộng đồng) | Tiếp nhận bình luận độc giả ở trạng thái chờ (`PENDING`); duyệt cho hiển thị hoặc ẩn/xóa bình luận vi phạm chính sách; tiếp nhận báo cáo khiếu nại bài viết. |
| **10** | **Finance** (Kế toán tài chính - SV4) | Vận hành cổng thanh toán trung tâm; giám sát đơn hàng (`transactions`); đối soát sao kê ngân hàng; xuất hóa đơn VAT điện tử; quản lý sổ quỹ kép; xử lý hoàn tiền theo nguyên tắc 4 mắt. |
| **11** | **System Admin** (Quản trị hệ thống) | Quản lý tài khoản, phân quyền RBAC; cấu hình vị trí quảng cáo (`ad_slots`); giám sát hệ thống phân phối Ad Delivery; tra cứu Audit Log an ninh và cấu hình kỹ thuật. |

---

## 4. MA TRẬN PHÂN CÔNG 5 THÀNH VIÊN (TEAM RACI & ACTIVITY FLOW)

Dự án được xây dựng bởi **5 sinh viên**, mỗi sinh viên làm chủ trọn vẹn 1 luồng nghiệp vụ khép kín (Frontend + Backend + DB Logic) theo **77 Use Cases** và **48 Màn hình**:

| Thành viên | Luồng nghiệp vụ | Phạm vi phân hệ | Quy mô Use Cases & Màn hình | Nhiệm vụ chính |
| :--- | :--- | :--- | :--- | :--- |
| **SV4: Huy (Leader)** | **Kế toán, Thanh toán & Đối soát** | `finance`, `transactions`, `refund_requests` | **14 Use Cases (`UC047` - `UC060`)**, **8 Màn hình** (II.4.1 - II.4.8) | Cổng thanh toán VietQR dùng chung; Webhook IPN Idempotent; hóa đơn VAT; sổ quỹ kép; đối soát sao kê ngân hàng; quy trình hoàn tiền 4 mắt; điều phối tích hợp hệ thống. |
| **SV1: Tây** | **Doanh nghiệp (Advertiser Portal)** | `advertising`, `advertisers`, `ad_campaigns` | **14 Use Cases (`UC001` - `UC014`)**, **10 Màn hình** (II.1.1 - II.1.10) | Hồ sơ doanh nghiệp B2B; tra cứu slot trống; tạo booking; tải banner; theo dõi CTR; quản lý hợp đồng quảng cáo. |
| **SV2: Trọng Phan** | **Tòa soạn, Vận hành & Phê duyệt** | `editorial`, duyệt bài, duyệt ad, duyệt comment | **14 Use Cases (`UC015` - `UC028`)**, **10 Màn hình** (II.2.1 - II.2.10) | Dashboard điều hành tòa soạn; duyệt báo giá; duyệt banner quảng cáo; duyệt xuất bản bài viết; duyệt bình luận cộng đồng. |
| **SV3: Hoàng** | **Khách & Độc giả (Reader Experience)** | `reader`, `articles` (public), `subscriptions` | **18 Use Cases (`UC029` - `UC046`)**, **10 Màn hình** (II.3.1 - II.3.10) | Giao diện đọc báo Free; preview Paywall; giỏ hàng Checkout mua bài/mua gói; tủ sách cá nhân; quản lý 2 thiết bị. |
| **SV5: Tùng** | **Hệ thống, Paywall, Ad Serving & AI** | `delivery`, CMS, `administration`, AI | **17 Use Cases (`UC061` - `UC077`)**, **10 Màn hình** (II.5.1 - II.5.10) | CMS soạn bài và quản lý phiên bản; Paywall Engine máy chủ; Ad Serving Engine lọc click tặc; trợ lý AI biên tập; Audit Log an ninh. |

---

## 5. 21 QUY TẮC NGHIỆP VỤ & KIẾN TRÚC BẤT BIẾN (INVARIANT RULES)

Bất kỳ tính năng hoặc mã nguồn nào trong hệ thống đều phải tuân thủ nghiêm ngặt 21 quy tắc sau:

1. **Đọc Free 100% không bắt đăng nhập:** Khách vãng lai đọc toàn bộ bài Free, xem chuyên mục, tìm kiếm và xem bình luận đã duyệt mà không bị ép mở modal đăng nhập.
2. **Quyền Premium theo Scope chi tiết:** Quyền đọc được cấp cụ thể theo từng bài viết (`article_purchases`) hoặc theo gói chuyên mục/toàn trang (`subscriptions`). Tuyệt đối không dùng cờ boolean `is_premium = true` để đại diện chung.
3. **Paywall thực thi ở Server-side:** Khi bài là PREMIUM và người đọc chưa có quyền, API/HTML chỉ trả về 30% đoạn trích tóm tắt (preview). Tuyệt đối không trả full text trong JSON rồi dùng CSS che mờ.
4. **Xác minh thanh toán độc lập ở Backend:** Không bao giờ cấp quyền hay xác nhận đơn hàng dựa vào URL chuyển hướng `return_url` trên trình duyệt. Phải đợi Webhook IPN có chữ ký số bảo mật từ Cổng thanh toán.
5. **Webhook Idempotency & Tự phục hồi:** Xử lý Webhook phải có cơ chế chống xử lý trùng (Idempotent) dựa trên mã giao dịch. Nếu webhook bắn lại nhiều lần, không cộng tiền hay mở quyền 2 lần. Nếu tiền đã nhận nhưng cấp quyền lỗi, worker tự động chạy ngầm để bù quyền.
6. **Xử lý tiền về sau khi hết hạn giữ chỗ:** Đơn booking quảng cáo có thời hạn giữ chỗ tạm thời (15-30 phút). Nếu tiền về muộn sau khi slot hết hạn, hệ thống kiểm tra lại lịch: nếu còn trống thì kích hoạt, nếu đã có người khác mua thì chuyển vào hàng đợi hoàn tiền hoặc đổi lịch.
7. **Chống trùng lịch (Double Booking) tại Database:** Ngăn chặn hai doanh nghiệp đặt trùng slot độc quyền cùng ngày bằng cơ chế khóa bản ghi tại Database Transaction (Pessimistic/Optimistic Lock), không chỉ dựa vào kiểm tra ở frontend.
8. **Phiên bản hóa Creative quảng cáo & Bài viết:** Khi thay ảnh hoặc URL banner đang chạy, hệ thống tạo bản ghi mới (`ad_creatives.version_number`). Chiến dịch vẫn chạy bản cũ cho đến khi bản mới được duyệt (`APPROVED`). Bài viết đã xuất bản khi sửa cũng sinh phiên bản mới trong `article_versions`.
9. **Điều kiện chạy chiến dịch (Ad Serving Gate):** Banner chỉ được phân phối khi thỏa mãn đủ 5 điều kiện: (1) Lịch còn hiệu lực, (2) Slot đang bật, (3) Creative ở trạng thái `APPROVED`, (4) Đã thanh toán hoặc có bảo lãnh công nợ, (5) Không bị dừng khẩn cấp.
10. **Tắt gia hạn khác với hoàn tiền:** Hủy tự động gia hạn gói cước chỉ có hiệu lực ở kỳ tiếp theo; độc giả vẫn giữ nguyên quyền đọc đến hết ngày chu kỳ hiện tại đã trả tiền.
11. **Giới hạn số tiền hoàn (Refund Cap):** Tổng số tiền hoàn qua các đợt không bao giờ vượt quá số tiền thực thu của đơn hàng gốc. Mọi yêu cầu hoàn tiền đang chờ duyệt (`PENDING`) phải được trừ vào hạn mức hoàn còn lại.
12. **Bình luận sau khi sửa phải kiểm duyệt lại:** Bình luận đã duyệt nếu độc giả chỉnh sửa nội dung thì trạng thái tự động chuyển về `PENDING`, lập tức ẩn khỏi trang công khai cho đến khi Moderator duyệt lại.
13. **AI có vai trò Cố vấn (Human-in-the-Loop):** AI chỉ đưa ra gợi ý (tiêu đề, tóm tắt, tag, cảnh báo gian lận). AI không bao giờ tự ý quyết định trừ tiền, xuất bản bài viết hoặc cấp quyền.
14. **Cách ly dữ liệu đa người thuê (Multi-tenant Isolation):** Doanh nghiệp A tuyệt đối không xem được dữ liệu của Doanh nghiệp B (banner, CTR, hóa đơn), kể cả khi đoán được ID trên URL (ngăn chặn lỗ hổng IDOR).
15. **Quyền độc giả Ad-Free không làm sai lệch số liệu:** Khi độc giả có gói không quảng cáo đọc bài, hệ thống không tính lượt xem này là một vị trí quảng cáo bị bỏ trống (Unfilled Impression).
16. **Nhất quán định nghĩa chỉ số:** Số liệu Impressions, Clicks, CTR, Doanh thu, MRR trên Dashboard doanh nghiệp, Dashboard tòa soạn và Báo cáo xuất file phải khớp nhau 100%.
17. **Nguyên tắc phân định ranh giới nghiêm ngặt (Strict Boundary):** Mỗi thành viên chỉ làm chủ phân hệ của mình. Giao tiếp liên module chỉ đi qua Shared Service Contracts / DTOs / Events, không can thiệp trực tiếp vào mã nguồn nội bộ của module khác.
18. **Tác phong làm việc kỹ thuật:** Trao đổi ngắn gọn, thực tế, đúng phong cách kỹ thuật; rà soát chống xung đột và bảo vệ kiến trúc chuẩn mực.
19. **Nguyên tắc xác minh nghiêm ngặt:** Đọc kỹ tài liệu dự án, thiếu thì hỏi xin tài liệu, không tự ý suy đoán nghiệp vụ.
20. **Quản trị tầng dùng chung:** Spring Security do Leader SV4 làm chủ tại file master `SecurityConfig.java`. Cấu hình mật khẩu dev là `password`. Điều hướng login dùng `getDefaultBackofficeRoute`.
21. **Đồng bộ bộ nhớ kép (Dual-Workspace Memory Sync):** Mọi cập nhật tài liệu ngữ cảnh, quy tắc kiến trúc mới bắt buộc đồng bộ song song vào cả thư mục gốc và thư mục làm việc của Leader Huy.

---

## 6. SỔ TAY 10 KỊCH BẢN BẢO VỆ ĐỒ ÁN (DEFENSE SCENARIOS)

Khi bảo vệ trước Hội đồng chấm thi SWP391, nhóm tự tin thực hiện 10 kịch bản chứng minh năng lực hệ thống:
1. **Server-Side Paywall:** Mở tab ẩn danh (Guest) đọc bài Free bình thường; mở bài Premium chỉ thấy 30% preview. Bấm F12 Inspect xem mã HTML và tab Network, chứng minh 70% nội dung không hề tồn tại ở máy khách.
2. **Webhook Idempotency:** Reader thanh toán mua bài qua quét mã VietQR $\rightarrow$ Backend nhận webhook mở khóa bài ngay lập tức. Dùng Postman bắn lại đúng webhook đó lần thứ hai $\rightarrow$ Hệ thống phản hồi `ALREADY_PROCESSED`, không cộng tiền hay mở trùng quyền.
3. **Chống trùng lịch (Double Booking):** Mở 2 trình duyệt cho 2 doanh nghiệp cùng chọn 1 slot độc quyền vào cùng 1 ngày $\rightarrow$ Chỉ 1 doanh nghiệp đặt thành công, người thứ hai nhận cảnh báo slot vừa được giữ chỗ.
4. **Phiên bản banner:** Doanh nghiệp tải ảnh banner mới thay thế banner đang chạy $\rightarrow$ Giao diện trang báo độc giả vẫn hiển thị banner cũ cho đến khi Ban biên tập bấm "Duyệt bản mới".
5. **Nút dừng khẩn cấp (Kill-Switch):** Ban biên tập bấm "Tạm dừng khẩn cấp" một banner quảng cáo $\rightarrow$ Ngay lập tức F5 trang chủ không còn hiển thị banner đó.
6. **Kiểm duyệt lại bình luận:** Độc giả gửi bình luận $\rightarrow$ Được duyệt hiển thị $\rightarrow$ Độc giả bấm sửa nội dung $\rightarrow$ Bình luận lập tức biến mất khỏi trang công khai và quay về danh sách chờ duyệt của Moderator.
7. **Quy trình hoàn tiền 4 mắt:** Kế toán viên tạo phiếu đề xuất hoàn tiền cho đơn lỗi $\rightarrow$ Kế toán trưởng duyệt phiếu $\rightarrow$ Hệ thống gọi Refund API, trạng thái chuyển `REFUNDED`, quyền đọc bài bị thu hồi, báo cáo doanh thu tự trừ đúng số tiền hoàn.
8. **AI Trợ lý biên tập:** Phóng viên soạn bài, bấm "AI Gợi ý tiêu đề" $\rightarrow$ AI sinh 3 tiêu đề (chính luận, SEO, mobile) $\rightarrow$ Phóng viên chọn, biên tập lại rồi mới nộp Tổng biên tập duyệt xuất bản.
9. **Khả năng tự phục hồi khi lỗi:** Giả lập cổng thanh toán hoặc mạng bị timeout khi trừ tiền $\rightarrow$ Hệ thống ghi nhận trạng thái chờ và worker tự động bù quyền khi kết nối phục hồi mà không bắt khách trả tiền lần 2.
10. **Bảo mật Multi-tenant:** Doanh nghiệp A cố tình sửa ID trên URL sang ID chiến dịch của Doanh nghiệp B $\rightarrow$ Hệ thống trả về lỗi `403 Forbidden` ngăn chặn truy cập trái phép.
