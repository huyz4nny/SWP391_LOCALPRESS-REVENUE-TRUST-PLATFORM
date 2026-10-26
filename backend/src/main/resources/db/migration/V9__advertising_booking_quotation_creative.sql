-- SV1 Iteration 2: Campaign Booking, Quotation Confirmation, Advertising Payment, Creative Submission.
-- V7 (google identities) và V8 (subscription plan scope) thuộc nhánh Tung nên advertising lấy V9.
-- Mô hình theo SDS ADV-2: gửi booking tạo ngay ad_campaigns PENDING (1 campaign = 1 slot).

ALTER TABLE ad_campaigns
    ADD COLUMN request_key            VARCHAR(64) NULL AFTER slot_id,
    ADD COLUMN contact_person         VARCHAR(150) NULL AFTER campaign_name,
    ADD COLUMN contact_phone          VARCHAR(20) NULL AFTER contact_person,
    ADD COLUMN contact_email          VARCHAR(255) NULL AFTER contact_phone,
    -- Báo giá do SV2 (Quotation Management) ghi: tăng quote_version mỗi lần gửi/sửa báo giá.
    ADD COLUMN quote_version          INT UNSIGNED NOT NULL DEFAULT 0 AFTER quoted_amount,
    ADD COLUMN quote_discount_percent DECIMAL(5,2) NULL AFTER quote_version,
    ADD COLUMN quote_notes            TEXT NULL AFTER quote_discount_percent,
    -- Snapshot lúc doanh nghiệp xác nhận (UC006): giá đã chốt không đổi theo bảng giá về sau.
    ADD COLUMN accepted_quote_version INT UNSIGNED NULL AFTER quotation_status,
    ADD COLUMN accepted_amount        DECIMAL(12,2) NULL AFTER accepted_quote_version,
    ADD COLUMN accepted_by            BIGINT UNSIGNED NULL AFTER accepted_amount,
    ADD COLUMN accepted_at            DATETIME NULL AFTER accepted_by,
    -- Hạn giữ chỗ chờ thanh toán. NULL = chưa xác nhận báo giá (giữ chỗ tới khi tòa soạn xử lý).
    ADD COLUMN hold_expires_at        DATETIME NULL AFTER accepted_at,
    ADD COLUMN payment_order_code     VARCHAR(255) NULL AFTER payment_status,
    -- LATE_PAYMENT_CONFLICT: tiền về sau khi hết hạn giữ chỗ và slot đã bị người khác lấy (Rule 6).
    ADD COLUMN payment_issue          VARCHAR(40) NULL AFTER payment_order_code,
    ADD COLUMN updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
    ADD CONSTRAINT uk_ad_campaigns_request UNIQUE (advertiser_id, request_key),
    ADD CONSTRAINT fk_ad_campaigns_accepted_by FOREIGN KEY (accepted_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    ADD CONSTRAINT chk_ad_campaigns_discount CHECK (quote_discount_percent IS NULL OR (quote_discount_percent >= 0 AND quote_discount_percent <= 100)),
    ADD INDEX idx_ad_campaigns_slot_dates (slot_id, start_date, end_date);

ALTER TABLE ad_creatives
    ADD COLUMN title           VARCHAR(255) NULL AFTER version_number,
    ADD COLUMN width           INT UNSIGNED NULL AFTER target_url,
    ADD COLUMN height          INT UNSIGNED NULL AFTER width,
    ADD COLUMN file_size_bytes INT UNSIGNED NULL AFTER height,
    ADD COLUMN uploaded_by     BIGINT UNSIGNED NULL AFTER reviewed_by,
    ADD COLUMN uploaded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER rejection_reason,
    ADD CONSTRAINT fk_ad_creatives_uploader FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL;
