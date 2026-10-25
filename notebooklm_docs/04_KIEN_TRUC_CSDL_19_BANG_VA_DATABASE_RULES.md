# KIẾN TRÚC CƠ SỞ DỮ LIỆU & RÀNG BUỘC TOÀN VẸN (DATABASE SCHEMA & INTEGRITY RULES)
> **Dự án:** LocalPress — Revenue & Trust Platform  
> **Cơ sở dữ liệu:** MySQL 8.0+ | Bộ mã: `utf8mb4_unicode_ci` | File Migration: `V1__create_tables.sql`  
> **Trọng tâm tài liệu:** 19 Thực thể cốt lõi và các bảng thuộc phân hệ Kế toán, Thanh toán (`SV4 — Huy`)  
> **Tài liệu chuẩn bị cho:** NotebookLM Phân tích Mô hình Dữ liệu

---

## 1. DANH MỤC 19 THỰC THỂ CỐT LÕI (CRUD ENTITIES MATRIX)

Cơ sở dữ liệu LocalPress quản lý 19 thực thể cốt lõi được theo dõi trong ma trận CRUD của `project_tracking_group2.xlsx`:

| STT | Tên thực thể | Tên bảng MySQL | Phân hệ chính | Mục đích lưu trữ & Nghiệp vụ |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `users` | `users` | Dùng chung / SV5 | Tài khoản định danh toàn hệ thống (kèm bảng phụ `user_devices`). |
| **2** | `categories` | `categories` | CMS / SV5 | Danh mục tin tức địa phương phân cấp cha - con. |
| **3** | `category_follows`| `category_follows`| Độc giả / SV3 | Danh sách chuyên mục độc giả lựa chọn theo dõi. |
| **4** | `articles` | `articles` | CMS / SV5 | Thực thể bài viết gốc (metadata, slug, access_type FREE/PREMIUM). |
| **5** | `article_versions`| `article_versions`| CMS / SV5 | Toàn văn bài viết, tiêu đề, sapo, số phiên bản duyệt biên tập. |
| **6** | `comments` | `comments` | Độc giả / SV3 | Bình luận bài viết của độc giả (trạng thái PENDING, APPROVED, REJECTED). |
| **7** | `saved_articles` | `saved_articles` | Độc giả / SV3 | Tủ sách cá nhân (Bookmark bài viết yêu thích & lịch sử đọc). |
| **8** | `subscription_plans`| `subscription_plans`| Tòa soạn / SV2 | Danh mục các gói cước đọc báo (tháng, quý, năm, audio, ad-free). |
| **9** | `subscriptions` | `subscriptions` | Độc giả / SV3 | Gói cước độc giả đã đăng ký (thời hạn bắt đầu, kết thúc, tự động gia hạn). |
| **10**| `article_purchases`| `article_purchases`| Độc giả / SV3 | Ghi nhận độc giả mua lẻ từng bài viết phóng sự Premium. |
| **11**| `advertisers` | `advertisers` | Doanh nghiệp / SV1| Hồ sơ doanh nghiệp B2B (tên công ty, MST, địa chỉ, người đại diện). |
| **12**| `ad_slots` | `ad_slots` | Nền tảng / SV5 | Danh mục các vị trí hiển thị quảng cáo trên trang báo. |
| **13**| `ad_campaigns` | `ad_campaigns` | Doanh nghiệp / SV1| Chiến dịch quảng cáo của doanh nghiệp (ngày chạy, tổng ngân sách, trạng thái). |
| **14**| `ad_creatives` | `ad_creatives` | Doanh nghiệp / SV1| Banner hình ảnh, URL liên kết đích và phiên bản duyệt của chiến dịch. |
| **15**| `ad_stats` | `ad_stats` | Nền tảng / SV5 | Thống kê số lượt hiển thị (Impressions), Click hợp lệ và Click gian lận. |
| **16**| `transactions` | `transactions` | **Kế toán / SV4** | **Đơn hàng thanh toán trung tâm toàn hệ thống (B2B + B2C).** |
| **17**| `refund_requests`| `refund_requests`| **Kế toán / SV4** | **Yêu cầu hoàn tiền theo nguyên tắc 4 mắt và thu hồi quyền lợi.** |
| **18**| `notifications` | `notifications` | Dùng chung / All | Trung tâm thông báo người dùng và doanh nghiệp. |
| **19**| `audit_logs` | `audit_logs` | Hệ thống / All | Nhật ký kiểm toán an ninh và truy vết thao tác nhạy cảm. |

---

## 2. ĐẶC TẢ CHI TIẾT CÁC BẢNG DO SV4 (HUY) QUẢN LÝ TRỰC TIẾP

### 2.1. Bảng `transactions` — Trục xương sống giao dịch tài chính
Bảng này ghi nhận toàn bộ các giao dịch phát sinh từ Mua gói cước, Mua bài lẻ hoặc Đặt quảng cáo:

```sql
CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_code VARCHAR(64) NOT NULL UNIQUE,       -- Mã đơn hệ thống: TXN-YYYYMMDD-XXXX
    user_id BIGINT NOT NULL,                           -- Người thực hiện giao dịch (FK users)
    order_type ENUM('SUBSCRIPTION', 'ARTICLE_PURCHASE', 'AD_CAMPAIGN') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,                    -- Số tiền giao dịch (VND)
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    payment_method ENUM('VIETQR', 'MOMO', 'VNPAY', 'BANK_TRANSFER') NOT NULL,
    payment_gateway VARCHAR(50) DEFAULT 'VIETQR',       -- Tên cổng: VIETQR, SEPAY, VNPAY, MOMO
    gateway_reference VARCHAR(100) NULL,               -- Mã tham chiếu trả về từ phía ngân hàng/cổng
    status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    
    -- Liên kết nguồn gốc đơn hàng (Chỉ 1 trong 3 trường được phép có giá trị)
    subscription_id BIGINT NULL,                       -- FK subscriptions
    purchase_id BIGINT NULL,                           -- FK article_purchases
    campaign_id BIGINT NULL,                           -- FK ad_campaigns
    
    idempotency_key VARCHAR(128) NULL UNIQUE,          -- Khóa chống xử lý Webhook trùng lặp
    notes TEXT NULL,                                   -- Ghi chú nội dung chuyển khoản
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Ràng buộc toàn vẹn quan hệ
    CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_tx_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
    CONSTRAINT fk_tx_purchase FOREIGN KEY (purchase_id) REFERENCES article_purchases(id),
    CONSTRAINT fk_tx_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id),

    -- RÀNG BUỘC SỐNG CÒN: Chỉ phục vụ đúng 1 mục đích duy nhất
    CONSTRAINT chk_single_transaction_target CHECK (
        (subscription_id IS NOT NULL AND purchase_id IS NULL AND campaign_id IS NULL) OR
        (subscription_id IS NULL AND purchase_id IS NOT NULL AND campaign_id IS NULL) OR
        (subscription_id IS NULL AND purchase_id IS NULL AND campaign_id IS NOT NULL)
    )
);
```

### 2.2. Bảng `refund_requests` — Quản trị hoàn tiền theo nguyên tắc 4 mắt
```sql
CREATE TABLE refund_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    refund_code VARCHAR(64) NOT NULL UNIQUE,           -- Mã hoàn tiền: REF-YYYYMMDD-XXXX
    transaction_id BIGINT NOT NULL,                    -- Đơn hàng gốc cần hoàn tiền (FK transactions)
    requested_by BIGINT NOT NULL,                      -- Kế toán viên lập đề xuất hoàn tiền (FK users)
    approved_by BIGINT NULL,                           -- Kế toán trưởng phê duyệt hoàn tiền (FK users)
    amount DECIMAL(15, 2) NOT NULL,                    -- Số tiền yêu cầu hoàn lại
    reason TEXT NOT NULL,                              -- Lý do hoàn tiền (lỗi trừ trùng, hủy dịch vụ...)
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    gateway_refund_id VARCHAR(100) NULL,               -- Mã hoàn tiền từ cổng thanh toán
    revoked_rights_details TEXT NULL,                  -- Chi tiết quyền đọc hoặc booking bị thu hồi
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    CONSTRAINT fk_refund_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    CONSTRAINT fk_refund_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
    CONSTRAINT fk_refund_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

---

## 3. CÁC RÀNG BUỘC TOÀN VẸN DỮ LIỆU SỐNG CÒN (DATABASE INVARIANT RULES)

### 3.1. Ràng buộc `chk_single_transaction_target`
Mỗi bản ghi trong bảng `transactions` là một đơn hàng tài chính độc lập. Nó bắt buộc phải trỏ tới đúng một trong ba đối tượng kinh doanh:
* **Hoặc** là Mua gói thuê bao (`subscription_id NOT NULL`)
* **Hoặc** là Mua lẻ một bài viết (`purchase_id NOT NULL`)
* **Hoặc** là Thanh toán booking quảng cáo (`campaign_id NOT NULL`)
Không cho phép một giao dịch vừa mua bài vừa mua quảng cáo, cũng không cho phép một giao dịch "vô thừa nhận" không gắn với bất kỳ sản phẩm nào.

### 3.2. Giới hạn số tiền hoàn (Refund Cap Constraint)
* Quy tắc logic tại tầng Database và Service:
  $$\sum \text{amount}(\text{refund\_requests where transaction\_id} = X \text{ and status in ('PENDING', 'APPROVED', 'COMPLETED')}) \le \text{transactions.amount}$$
* Không bao giờ cho phép tổng số tiền hoàn vượt quá số tiền thực thu của giao dịch gốc.
* Các yêu cầu hoàn tiền đang ở trạng thái `PENDING` (chờ duyệt) bắt buộc phải được tính vào hạn mức hoàn, tránh trường hợp 2 kế toán viên cùng tạo 2 phiếu hoàn tiền cùng lúc gây thất thoát công quỹ.

### 3.3. Bảo mật dữ liệu thanh toán & Tuân thủ PCI-DSS
* Hệ thống **tuyệt đối không lưu trữ thông tin thẻ ngân hàng, số thẻ tín dụng hay mã bí mật CVV/CVC** trong cơ sở dữ liệu.
* Chỉ lưu trữ mã giao dịch định danh (`transaction_code`), mã tham chiếu từ cổng (`gateway_reference`), ngân hàng thụ hưởng và số tiền.

### 3.4. Quản lý phiên thiết bị (`user_devices`)
* Bảng `user_devices` quản lý các thiết bị đăng nhập đồng thời của độc giả:
  * Khóa phức hợp `(user_id, device_fingerprint)`.
  * Trigger / Query giới hạn tối đa 2 thiết bị hoạt động đồng thời: Nếu tài khoản đăng nhập trên thiết bị thứ 3, thiết bị cũ nhất có `last_active_at` xa nhất sẽ bị thu hồi token truy cập (`REVOKED`).
