# MA TRẬN 77 USE CASES & 48 MÀN HÌNH TOÀN DỰ ÁN LOCALPRESS
> **Dự án:** LocalPress — Revenue & Trust Platform  
> **Nguồn dữ liệu:** `project_tracking_group2.xlsx` (Bảng theo dõi chính thức)  
> **Cấu trúc:** 5 Sinh viên × 3 Đợt triển khai (Activity Flow)  
> **Tài liệu chuẩn bị cho:** NotebookLM Đối chiếu Kiến trúc & Traceability Matrix

---

## 1. TỔNG QUAN PHÂN BỔ THEO 5 SINH VIÊN

| Phân hệ | Sinh viên phụ trách | Số Use Cases | Số Màn hình / Phân hệ | Tỷ lệ P0 / P1 / P2 | Trọng tâm nghiệp vụ |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **SV1** | **Tây** | 14 UCs (`UC001` - `UC014`) | 10 Màn hình (II.1.1 - II.1.10) | 16 P0, 9 P1, 0 P2 | Doanh nghiệp B2B: Booking slot, upload banner, báo cáo CTR |
| **SV2** | **Trọng Phan** | 14 UCs (`UC015` - `UC028`) | 10 Màn hình (II.2.1 - II.2.10) | 14 P0, 8 P1, 3 P2 | Tòa soạn & Điều hành: Duyệt báo giá, duyệt banner, duyệt bài viết, duyệt comment |
| **SV3** | **Hoàng** | 18 UCs (`UC029` - `UC046`) | 10 Màn hình (II.3.1 - II.3.10) | 18 P0, 6 P1, 1 P2 | Khách & Độc giả: Đọc Free, preview Paywall, checkout, tủ sách cá nhân |
| **SV4** | **Huy (Leader)** | 14 UCs (`UC047` - `UC060`) | 8 Màn hình (II.4.1 - II.4.8) | 12 P0, 12 P1, 1 P2 | Kế toán & Đối soát: Cổng QR dùng chung, IPN, đối soát ngân hàng, hoàn tiền 4 mắt |
| **SV5** | **Tùng** | 17 UCs (`UC061` - `UC077`) | 10 Màn hình (II.5.1 - II.5.10) | 17 P0, 7 P1, 1 P2 | Nền tảng & AI: CMS bài viết, Paywall Server-side, Ad Serving, AI biên tập |
| **TỔNG CỘNG** | **5 Thành viên** | **77 Use Cases** | **48 Màn hình** | **125 Tiêu chí** | **Nền tảng Tòa soạn Doanh thu kép hoàn chỉnh** |

---

## 2. LỘ TRÌNH 3 ĐỢT TRIỂN KHAI THEO ACTIVITY FLOW

Hệ thống được thiết kế theo quy luật dòng chảy nghiệp vụ (Đầu $\rightarrow$ Giữa $\rightarrow$ Cuối quy trình):

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    LỘ TRÌNH 3 ĐỢT TRIỂN KHAI TOÀN DIỆN                   │
├──────────────────────────┬────────────────────────────┬───────────────────┤
│ ITERATION 1 (11 Màn hình)│ ITERATION 2 (17 Màn hình)  │ ITERATION 3 (20)  │
├──────────────────────────┼────────────────────────────┼───────────────────┤
│ • Đầu quy trình          │ • Giữa quy trình           │ • Cuối quy trình  │
│ • Setup hồ sơ, danh mục  │ • Giao dịch lõi, thanh toán│ • Đối soát, hoàn  │
│ • Soạn bài & Đọc Free    │ • Booking & Duyệt banner   │   tiền, báo cáo   │
│ • Sổ cái & Chứng từ      │ • Paywall & Gói cước       │ • AI, Ad Serving  │
└──────────────────────────┴────────────────────────────┴───────────────────┘
```

---

## 3. CHI TIẾT 48 MÀN HÌNH & 77 USE CASES CỦA TỪNG THÀNH VIÊN

### 3.1. SV1 — Tây: Doanh nghiệp & Quảng cáo B2B (10 Màn hình, 14 UCs)
* **ĐỢT 1 — ĐẦU QUY TRÌNH (2 Màn hình):**
  1. `Company Profile` (Screen | SRS/SDS II.1.1 | UC002 | Iter 1): Quản lý hồ sơ doanh nghiệp, MST, người đại diện.
  2. `Ad Slot Catalog` (Screen | SRS/SDS II.1.2 | UC003 | Iter 1): Tra cứu danh mục vị trí quảng cáo, kích thước, bảng giá.
* **ĐỢT 2 — GIỮA QUY TRÌNH (4 Màn hình):**
  3. `Campaign Booking` (Screen | SRS/SDS II.1.3 | UC004, UC005 | Iter 2): Chọn lịch chạy, kiểm tra chỗ trống (availability), gửi booking.
  4. `Quotation Confirmation` (Screen | SRS/SDS II.1.4 | UC006 | Iter 2): Xem và xác nhận bảng báo giá, đồng ý điều khoản dịch vụ.
  5. `Advertising Payment` (Screen | SRS/SDS II.1.5 | UC007 | Iter 2): Thanh toán đơn quảng cáo (kết nối cổng SV4 quét VietQR / IPN).
  6. `Creative Submission and Preview` (Screen | SRS/SDS II.1.6 | UC008 | Iter 2): Upload banner, nhập URL đích, xem trước mock preview.
* **ĐỢT 3 — CUỐI QUY TRÌNH (4 Màn hình):**
  7. `Advertising Dashboard` (Screen | SRS/SDS II.1.7 | UC001, UC010 | Iter 3): Báo cáo chỉ số Impression, Click, CTR minh bạch theo ngày.
  8. `Creative Replacement` (Screen | SRS/SDS II.1.8 | UC009 | Iter 3): Nộp banner mới thay thế banner đang chạy (sinh phiên bản mới).
  9. `Requests and Business Notifications` (Screen | SRS/SDS II.1.9 | UC011, UC013 | Iter 3): Hộp thư thông báo duyệt banner, nhắc nợ, khiếu nại.
  10. `Contracts and Documents` (Screen | SRS/SDS II.1.10 | UC012, UC014 | Iter 3): Quản lý hợp đồng quảng cáo, tải hóa đơn/chứng từ điện tử.

### 3.2. SV2 — Trọng Phan: Tòa soạn, Vận hành & Phê duyệt (10 Màn hình, 14 UCs)
* **ĐỢT 1 — ĐẦU QUY TRÌNH (2 Màn hình):**
  1. `Article Review and Publishing` (Screen | SRS/SDS II.2.1 | UC015 | Iter 1): Tổng biên tập duyệt xuất bản bài viết hoặc yêu cầu sửa.
  2. `Content Policy and Moderation` (Screen | SRS/SDS II.2.2 | UC016, UC017 | Iter 1): Cấu hình chính sách Free/Premium, duyệt bình luận độc giả.
* **ĐỢT 2 — GIỮA QUY TRÌNH (4 Màn hình):**
  3. `Pending Booking Queue` (Screen | SRS/SDS II.2.3 | UC018 | Iter 2): Danh sách các yêu cầu booking quảng cáo chờ xử lý.
  4. `Advertising Inventory Calendar` (Screen | SRS/SDS II.2.4 | UC019 | Iter 2): Lịch quản lý vị trí quảng cáo theo ngày/tuần/tháng.
  5. `Quotation Management` (Screen | SRS/SDS II.2.5 | UC020 | Iter 2): Soạn và gửi báo giá, áp dụng chiết khấu thương mại.
  6. `Creative Review` (Screen | SRS/SDS II.2.6 | UC021 | Iter 2): Kiểm duyệt hình ảnh banner, nội dung thông điệp, quét an toàn liên kết đích.
* **ĐỢT 3 — CUỐI QUY TRÌNH (4 Màn hình):**
  7. `Campaign Eligibility Check` (Screen | SRS/SDS II.2.7 | UC022 | Iter 3): Kiểm tra điều kiện kích hoạt chiến dịch (Ad Serving Gatekeeper).
  8. `Campaign Control` (Screen | SRS/SDS II.2.8 | UC023, UC024 | Iter 3): Nút tạm dừng khẩn cấp (Kill-Switch), xử lý bù hiển thị (Make-good).
  9. `Advertising Contract Management` (Screen | SRS/SDS II.2.9 | UC025, UC026 | Iter 3): Quản lý hợp đồng chính thức, phụ lục và khách hàng VIP.
  10. `Business Operation Dashboard` (Screen | SRS/SDS II.2.10 | UC027, UC028 | Iter 3): Dashboard doanh thu tòa soạn, phễu chuyển đổi độc giả.

### 3.3. SV3 — Hoàng: Khách & Độc giả (10 Màn hình, 18 UCs)
* **ĐỢT 1 — ĐẦU QUY TRÌNH (3 Màn hình):**
  1. `Homepage and Article Search` (Screen | SRS/SDS II.3.1 | UC029, UC030 | Iter 1): Trang chủ, tìm kiếm tin tức và lọc theo chuyên mục.
  2. `Article Reader` (Screen | SRS/SDS II.3.2 | UC031 | Iter 1): Đọc bài Free 100% không bắt đăng nhập, hỗ trợ Dark Mode.
  3. `Authentication` (Screen | SRS/SDS II.3.3 | UC032, UC033 | Iter 1): Đăng ký, đăng nhập tài khoản dùng chung, OTP quên mật khẩu.
* **ĐỢT 2 — GIỮA QUY TRÌNH (4 Màn hình):**
  4. `Premium Checkout` (Screen | SRS/SDS II.3.4 | UC034, UC035 | Iter 2): Giao diện chọn mua bài lẻ hoặc mua gói cước, chuyển đơn sang SV4.
  5. `Premium Article Reader` (Screen | SRS/SDS II.3.5 | UC036, UC037 | Iter 2): Preview 30% bài Premium, mở khóa toàn văn sau khi mua, audio TTS.
  6. `Personal Bookshelf` (Screen | SRS/SDS II.3.6 | UC038, UC039 | Iter 2): Tủ sách: Bài đã mua, Bài đã lưu, Lịch sử đọc, Bài được tặng.
  7. `Comments and Reports` (Screen | SRS/SDS II.3.7 | UC041, UC042 | Iter 2): Gửi bình luận, báo cáo vi phạm, sửa bình luận (duyệt lại).
* **ĐỢT 3 — CUỐI QUY TRÌNH (3 Màn hình):**
  8. `Followed Content` (Screen | SRS/SDS II.3.8 | UC040 | Iter 3): Theo dõi chuyên mục địa phương, luồng tin quan tâm.
  9. `Devices and Sessions` (Screen | SRS/SDS II.3.9 | UC043 | Iter 3): Quản lý phiên đăng nhập giới hạn tối đa 2 thiết bị.
  10. `Subscription, Transactions and Support` (Screen | SRS/SDS II.3.10 | UC044, UC045, UC046 | Iter 3): Quản lý gói cước, lịch sử đơn, hỗ trợ hoàn tiền.

### 3.4. SV4 — Huy (Leader): Kế toán, Thanh toán & Đối soát (8 Màn hình, 14 UCs)
* **ĐỢT 1 — ĐẦU QUY TRÌNH (2 Màn hình):**
  1. `Financial Documents and Ledger` (Screen | SRS/SDS II.4.1 | UC057, UC058 | Iter 1): Sổ cái ghi nhận dòng tiền, phát hành hóa đơn VAT điện tử.
  2. `Manual Bank Transfer Confirmation` (Screen | SRS/SDS II.4.2 | UC051 | Iter 1): Đối chiếu và xác nhận duyệt đơn chuyển khoản ngân hàng thủ công.
* **ĐỢT 2 — GIỮA QUY TRÌNH (2 Màn hình):**
  3. `Payment Processing` (Screen | SRS/SDS II.4.3 | UC047, UC048, UC049, UC050 | Iter 2): Tạo phiên thanh toán VietQR dùng chung; xử lý Webhook IPN Idempotent.
  4. `Advertiser Receivables` (Screen | SRS/SDS II.4.4 | UC053 | Iter 2): Quản lý công nợ doanh nghiệp quảng cáo B2B, nhắc nợ tự động.
* **ĐỢT 3 — CUỐI QUY TRÌNH (4 Màn hình):**
  5. `Cash Flow Dashboard` (Screen | SRS/SDS II.4.5 | UC052 | Iter 3): Dashboard dòng tiền, phân tích tỷ trọng doanh thu B2B/B2C, tiền hoàn, phí.
  6. `Payment Reconciliation` (Screen | SRS/SDS II.4.6 | UC054 | Iter 3): Tải sao kê ngân hàng, đối soát tự động, xử lý lệch tiền.
  7. `Refund and Rights Management` (Screen | SRS/SDS II.4.7 | UC055, UC056 | Iter 3): Quy trình hoàn tiền 4 mắt, thu hồi quyền đọc bài/quảng cáo.
  8. `Financial Reports and Alerts` (Screen | SRS/SDS II.4.8 | UC059, UC060 | Iter 3): Xuất báo cáo tài chính Excel/PDF, cảnh báo thanh toán treo/lỗi webhook.

### 3.5. SV5 — Tùng: Nền tảng CMS, Paywall, Ad Serving & AI (10 Màn hình, 17 UCs)
* **ĐỢT 1 — ĐẦU QUY TRÌNH (2 Màn hình):**
  1. `Article Editor` (Screen | SRS/SDS II.5.1 | UC061, UC062 | Iter 1): Trình soạn thảo bài viết Rich Text CMS, lưu nháp tự động.
  2. `Article Metadata and Media` (Screen | SRS/SDS II.5.2 | UC063, UC064 | Iter 1): Gắn danh mục, thẻ tag, tải hình ảnh, quản lý media.
* **ĐỢT 2 — GIỮA QUY TRÌNH (3 Màn hình):**
  3. `Article Version History` (Screen | SRS/SDS II.5.3 | UC065 | Iter 2): Quản lý lịch sử các phiên bản bài viết (`article_versions`), so sánh diff.
  4. `Article Submission and Revision` (Screen | SRS/SDS II.5.4 | UC066 | Iter 2): Gửi bài duyệt biên tập, chỉnh sửa theo phản hồi của tòa soạn.
  5. `Content Access and Paywall` (Screen | SRS/SDS II.5.5 | UC067, UC068 | Iter 2): Động cơ Server-side Paywall, kiểm tra quyền truy cập bài viết.
* **ĐỢT 3 — CUỐI QUY TRÌNH (5 Màn hình):**
  6. `AI Editorial Assistant` (Screen | SRS/SDS II.5.6 | UC069, UC070, UC071 | Iter 3): Trợ lý AI gợi ý tiêu đề (3 phong cách), tóm tắt sapo, gợi ý tag.
  7. `Advertising Slot Configuration` (Screen | SRS/SDS II.5.7 | UC072 | Iter 3): Cấu hình danh mục vị trí quảng cáo (`ad_slots`), bật/tắt hiển thị.
  8. `Advertisement Delivery and Tracking` (Screen | SRS/SDS II.5.8 | UC073, UC074 | Iter 3): Động cơ phân phối banner, bộ lọc click tặc (Anti-fraud).
  9. `Advertisement URL Monitoring` (Screen | SRS/SDS II.5.9 | UC075 | Iter 3): Quét định kỳ link đích banner quảng cáo, cảnh báo link chết/độc hại.
  10. `System Administration Console` (Screen | SRS/SDS II.5.10 | UC076, UC077 | Iter 3): Quản trị người dùng, phân quyền RBAC, kiểm tra Audit Log.

---

## 4. MA TRẬN PHỤ THUỘC & TÍCH HỢP GIỮA SV4 VỚI CÁC THÀNH VIÊN

SV4 đóng vai trò hạt nhân cung cấp dịch vụ cho các thành viên khác thông qua Hợp đồng dùng chung (Shared Contracts):

```
       ┌──────────────────┐               ┌──────────────────┐
       │   SV1 (Tây)      │               │   SV3 (Hoàng)    │
       │   Quảng cáo B2B  │               │   Độc giả B2C    │
       └─────────┬────────┘               └─────────┬────────┘
                 │                                  │
                 │ 1. Tạo đơn booking quảng cáo     │ 2. Tạo đơn mua bài/gói cước
                 │    POST /finance/orders          │    POST /finance/orders
                 ▼                                  ▼
       ┌─────────────────────────────────────────────────────┐
       │                 SV4 (Huy - Leader)                  │
       │                 SHARED PAYMENT CORE                 │
       │ ─────────────────────────────────────────────────── │
       │ • Sinh mã VietQR động chuẩn Napas 247               │
       │ • Webhook IPN Idempotent chống cộng trùng tiền      │
       │ • Hoàn tiền 4 mắt (Four-Eyes Refund Workflow)       │
       │ • Sổ quỹ kép (General Ledger)                       │
       └─────────────────────────┬───────────────────────────┘
                                 │
                                 │ 3. Phát sự kiện sau thanh toán/hoàn tiền
                                 │    PaymentSuccessEvent / RefundCompletedEvent
                                 ▼
       ┌─────────────────────────────────────────────────────┐
       │                 SV2 & SV5 (Tùng & Phan)             │
       │ ─────────────────────────────────────────────────── │
       │ • SV2: Mở khóa điều kiện kích hoạt chiến dịch (Ad)  │
       │ • SV5: Server-side Paywall mở khóa toàn văn bài     │
       │ • Khi hoàn tiền: Tự động thu hồi quyền đọc bài/slot │
       └─────────────────────────────────────────────────────┘
```
