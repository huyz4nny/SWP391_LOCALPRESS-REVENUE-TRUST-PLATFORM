-- =============================================================================
-- V10: ĐỐI SOÁT KỲ (UC054) & NHẮC NỢ QUẢNG CÁO (UC053) (SV4 - Huy)
-- =============================================================================
-- Trước V10, kỳ đối soát và các khoản lệch chỉ nằm trong bộ nhớ (khởi động lại là mất),
-- sao kê giả lập bằng chính tổng hệ thống. Từ V10:
--  - "Sao kê" là nguồn tiền phía ngân hàng mà SePay báo về (sepay_webhook_logs, gồm webhook + đồng bộ API).
--  - Mỗi khoản lệch là 1 dòng reconciliation_items, sinh tự động khi mở kỳ:
--      BANK_NOT_RECORDED     : ngân hàng có tiền nhưng hệ thống chưa ghi (ORDER_NOT_FOUND, AMOUNT_MISSING,
--                              tiền chuyển thêm vào đơn đã trả...). UNIQUE(log_id): 1 khoản chỉ 1 dòng lệch.
--      RECORDED_WITHOUT_BANK : kế toán đã ghi nhận theo khiếu nại nhưng SePay chưa báo khoản đó,
--                              cần đối chiếu sao kê thật. UNIQUE(complaint_id).
--  - Kỳ CLOSED (kế toán trưởng chốt) thì khóa mọi xử lý trong kỳ; không xóa dòng nào.
--  - Khóa ngoại không có ON DELETE / ON UPDATE (= RESTRICT): MySQL cấm hành động lan truyền trên cột
--    nằm trong CHECK, và dữ liệu tiền không được mất dấu người xử lý.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_periods (
    period_id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_month     VARCHAR(7) NOT NULL,
    status           ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    bank_total       DECIMAL(14,2) NULL,
    system_total     DECIMAL(14,2) NULL,
    unresolved_count INT NULL,
    close_note       VARCHAR(500) NULL,
    closed_by        BIGINT UNSIGNED NULL,
    closed_at        DATETIME NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_reconciliation_periods_month UNIQUE (period_month),
    CONSTRAINT fk_reconciliation_periods_closer
        FOREIGN KEY (closed_by) REFERENCES users(user_id),
    CONSTRAINT chk_reconciliation_periods_closed
        CHECK (status = 'OPEN' OR (closed_by IS NOT NULL AND closed_at IS NOT NULL))
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS reconciliation_items (
    item_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id        BIGINT UNSIGNED NOT NULL,
    item_type        ENUM('BANK_NOT_RECORDED', 'RECORDED_WITHOUT_BANK') NOT NULL,
    log_id           BIGINT UNSIGNED NULL,
    complaint_id     BIGINT UNSIGNED NULL,
    reference_code   VARCHAR(100) NULL,
    order_code       VARCHAR(255) NULL,
    amount           DECIMAL(14,2) NOT NULL DEFAULT 0,
    reason           VARCHAR(500) NOT NULL,
    status           ENUM('UNRESOLVED', 'RESOLVED') NOT NULL DEFAULT 'UNRESOLVED',
    action           ENUM('ASSIGN_ORDER', 'CREDIT_WALLET', 'EXPLAINED') NULL,
    action_ref       VARCHAR(255) NULL,
    action_result    VARCHAR(50) NULL,
    resolution_note  VARCHAR(500) NULL,
    resolved_by      BIGINT UNSIGNED NULL,
    resolved_at      DATETIME NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_reconciliation_items_log UNIQUE (log_id),
    CONSTRAINT uk_reconciliation_items_complaint UNIQUE (complaint_id),
    CONSTRAINT fk_reconciliation_items_period
        FOREIGN KEY (period_id) REFERENCES reconciliation_periods(period_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reconciliation_items_log
        FOREIGN KEY (log_id) REFERENCES sepay_webhook_logs(log_id),
    CONSTRAINT fk_reconciliation_items_complaint
        FOREIGN KEY (complaint_id) REFERENCES payment_complaints(complaint_id),
    CONSTRAINT fk_reconciliation_items_resolver
        FOREIGN KEY (resolved_by) REFERENCES users(user_id),
    CONSTRAINT chk_reconciliation_items_source
        CHECK ((log_id IS NOT NULL) + (complaint_id IS NOT NULL) = 1),
    CONSTRAINT chk_reconciliation_items_amount CHECK (amount >= 0),
    CONSTRAINT chk_reconciliation_items_resolved
        CHECK (status = 'UNRESOLVED' OR (action IS NOT NULL AND resolved_by IS NOT NULL AND resolution_note IS NOT NULL)),
    INDEX idx_reconciliation_items_period (period_id, status),
    INDEX idx_reconciliation_items_reference (reference_code)
) ENGINE = InnoDB;

-- Nhắc nợ quảng cáo (UC053). campaign_id / advertiser_id là khóa vô hướng tới bảng của SV1 (Rule 17):
-- SV4 chỉ ghi lịch sử nhắc và phát ReceivableReminderEvent, SV1 tự gửi thông báo cho doanh nghiệp.
CREATE TABLE IF NOT EXISTS receivable_reminders (
    reminder_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id      BIGINT UNSIGNED NOT NULL,
    advertiser_id    BIGINT UNSIGNED NOT NULL,
    amount_due       DECIMAL(14,2) NOT NULL,
    overdue_days     INT NOT NULL DEFAULT 0,
    note             VARCHAR(500) NULL,
    sent_by          BIGINT UNSIGNED NOT NULL,
    sent_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_receivable_reminders_sender
        FOREIGN KEY (sent_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_receivable_reminders_amount CHECK (amount_due > 0),
    INDEX idx_receivable_reminders_campaign (campaign_id, sent_at)
) ENGINE = InnoDB;
