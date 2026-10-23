-- =============================================================================
-- V5: NHẬT KÝ WEBHOOK / GIAO DỊCH SEPAY (SV4 - Huy, UC048, UC049)
-- =============================================================================
-- Mỗi lần SePay gọi webhook (hoặc hệ thống tự hỏi API SePay, hoặc demo giả lập) đều ghi 1 dòng,
-- kể cả khi sai khóa xác thực. Dùng để:
--  1. Chứng minh tiền vào là do SePay báo (Rule 4), xem lại nguyên payload thô khi đối soát.
--  2. Chống xử lý trùng theo đúng khuyến nghị của SePay: UNIQUE(sepay_id). SePay gửi lại
--     tối đa 7 lần trong 5 giờ nếu không nhận được {"success": true}.
-- source: WEBHOOK = SePay gọi vào, API_SYNC = LocalPress hỏi API SePay, SIMULATION = nút demo (chỉ profile dev).
-- =============================================================================

CREATE TABLE IF NOT EXISTS sepay_webhook_logs (
    log_id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    source            ENUM('WEBHOOK', 'API_SYNC', 'SIMULATION') NOT NULL,
    sepay_id          BIGINT NULL,
    auth_ok           BOOLEAN NOT NULL DEFAULT TRUE,
    gateway           VARCHAR(100) NULL,
    account_number    VARCHAR(50) NULL,
    transfer_type     VARCHAR(10) NULL,
    transfer_amount   DECIMAL(14,2) NULL,
    content           VARCHAR(500) NULL,
    payment_code      VARCHAR(100) NULL,
    reference_code    VARCHAR(100) NULL,
    transaction_date  VARCHAR(30) NULL,
    order_code        VARCHAR(255) NULL,
    result_status     VARCHAR(50) NOT NULL,
    result_message    VARCHAR(500) NULL,
    raw_payload       TEXT NULL,
    remote_ip         VARCHAR(64) NULL,
    received_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_sepay_webhook_logs_sepay_id UNIQUE (sepay_id),
    INDEX idx_sepay_logs_received (received_at),
    INDEX idx_sepay_logs_order (order_code),
    INDEX idx_sepay_logs_status (result_status, received_at)
) ENGINE = InnoDB;
