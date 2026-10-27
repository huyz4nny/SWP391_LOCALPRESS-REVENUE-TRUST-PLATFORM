-- =============================================================================
-- V4: KHIẾU NẠI THANH TOÁN CHƯA ĐƯỢC GHI NHẬN (SV4 - Huy, UC051)
-- =============================================================================
-- Thay cho luồng "kế toán duyệt chuyển khoản thủ công": mọi khoản tiền vào đều đi qua
-- webhook SePay. Nếu khách đã chuyển tiền mà hệ thống không ghi nhận (webhook lỡ, sai nội dung CK),
-- khách gửi khiếu nại, kế toán đối chiếu sao kê rồi Ghi nhận hoặc Từ chối (có lý do).
-- UNIQUE(bank_reference): một lần chuyển tiền chỉ được khiếu nại một lần.
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_complaints (
    complaint_id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT UNSIGNED NOT NULL,
    order_code       VARCHAR(255) NULL,
    amount           DECIMAL(12,2) NOT NULL,
    transferred_at   DATETIME NOT NULL,
    bank_reference   VARCHAR(100) NOT NULL,
    note             VARCHAR(500) NULL,
    status           ENUM('OPEN', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    resolution       VARCHAR(50) NULL,
    resolution_note  VARCHAR(500) NULL,
    resolved_by      BIGINT UNSIGNED NULL,
    resolved_at      DATETIME NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_payment_complaints_bank_ref UNIQUE (bank_reference),
    CONSTRAINT fk_payment_complaints_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_payment_complaints_resolver
        FOREIGN KEY (resolved_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_payment_complaints_amount CHECK (amount > 0),
    INDEX idx_payment_complaints_status (status, created_at),
    INDEX idx_payment_complaints_user (user_id, created_at)
) ENGINE = InnoDB;
