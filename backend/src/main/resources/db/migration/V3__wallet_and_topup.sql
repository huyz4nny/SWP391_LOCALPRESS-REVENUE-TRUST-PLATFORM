-- =============================================================================
-- V3: VÍ LOCALPRESS & NẠP TIỀN QUA SEPAY (SV4 - Huy)
-- =============================================================================
-- 1. transactions: thêm loại TOPUP (nạp ví, không gắn đối tượng nào),
--    cột description (hiển thị trên trang thanh toán) và expires_at (hạn mã QR).
-- 2. wallets: số dư ví của từng user, CHECK không cho âm.
-- 3. wallet_entries: sổ chi tiết ví. UNIQUE(transaction_id, direction) chặn
--    cộng/trừ trùng khi webhook bắn lại nhiều lần (Rule 5).
-- Nạp ví là công nợ phải trả khách, không phải doanh thu. Doanh thu chỉ ghi nhận
-- khi khách tiêu ví (payment_method = 'WALLET') hoặc trả QR trực tiếp cho đơn hàng.
-- =============================================================================

ALTER TABLE transactions
    MODIFY transaction_type ENUM('SUBSCRIPTION', 'ARTICLE', 'AD', 'REFUND', 'TOPUP') NOT NULL,
    ADD COLUMN description VARCHAR(255) NULL AFTER bank_code,
    ADD COLUMN expires_at DATETIME NULL AFTER created_at;

ALTER TABLE transactions DROP CHECK chk_transactions_targets;

ALTER TABLE transactions ADD CONSTRAINT chk_transactions_targets CHECK (
    (transaction_type = 'SUBSCRIPTION' AND subscription_id IS NOT NULL AND purchase_id IS NULL AND campaign_id IS NULL AND original_transaction_id IS NULL) OR
    (transaction_type = 'ARTICLE' AND purchase_id IS NOT NULL AND subscription_id IS NULL AND campaign_id IS NULL AND original_transaction_id IS NULL) OR
    (transaction_type = 'AD' AND campaign_id IS NOT NULL AND subscription_id IS NULL AND purchase_id IS NULL AND original_transaction_id IS NULL) OR
    (transaction_type = 'REFUND' AND original_transaction_id IS NOT NULL AND subscription_id IS NULL AND purchase_id IS NULL AND campaign_id IS NULL) OR
    (transaction_type = 'TOPUP' AND subscription_id IS NULL AND purchase_id IS NULL AND campaign_id IS NULL AND original_transaction_id IS NULL)
);

CREATE TABLE IF NOT EXISTS wallets (
    wallet_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    balance     DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uk_wallets_user UNIQUE (user_id),
    CONSTRAINT fk_wallets_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_wallets_balance CHECK (balance >= 0)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS wallet_entries (
    entry_id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wallet_id       BIGINT UNSIGNED NOT NULL,
    transaction_id  BIGINT UNSIGNED NOT NULL,
    direction       ENUM('CREDIT', 'DEBIT') NOT NULL,
    amount          DECIMAL(14,2) NOT NULL,
    balance_after   DECIMAL(14,2) NOT NULL,
    reason          VARCHAR(255) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_wallet_entries_tx_direction UNIQUE (transaction_id, direction),
    CONSTRAINT fk_wallet_entries_wallet
        FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_wallet_entries_transaction
        FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    CONSTRAINT chk_wallet_entries_amount CHECK (amount > 0),
    INDEX idx_wallet_entries_wallet_created (wallet_id, created_at)
) ENGINE = InnoDB;
