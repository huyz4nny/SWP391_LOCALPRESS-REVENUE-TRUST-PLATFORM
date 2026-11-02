-- =============================================================================
-- V12: BỎ VÍ LOCALPRESS — HỆ THỐNG KHÔNG GIỮ TIỀN KHÁCH (SV4 - Huy)
-- =============================================================================
-- Theo yêu cầu của giảng viên (01/11/2026): LocalPress không được giữ tiền khách.
-- Mọi đơn (bài, gói, quảng cáo) trả thẳng bằng QR SePay có sẵn đúng mã đơn + đúng số tiền,
-- SePay báo về khớp thì đơn PAID. Không còn ví, nạp tiền, nạp bù, trả bằng số dư.
-- Khoản không khớp (sai số tiền, về muộn, không có mã đơn) chỉ ghi sepay_webhook_logs;
-- khách khiếu nại (UC051), kế toán ghi vào đơn hoặc chuyển trả lại tài khoản khách.
--
-- 1. Xóa sổ ví và bảng ví (V3).
-- 2. Xóa giao dịch TOPUP (chỉ là tiền nạp ví, không gắn đơn nào), bỏ loại TOPUP khỏi ENUM.
-- 3. Bỏ cột topup_for_order (V6).
-- 4. reconciliation_items.action: bỏ CREDIT_WALLET (dòng cũ chuyển thành EXPLAINED), thêm RETURNED_TO_CUSTOMER.
-- Đơn mua cũ có payment_method = 'WALLET' giữ nguyên làm lịch sử.
-- =============================================================================

DROP TABLE IF EXISTS wallet_entries;
DROP TABLE IF EXISTS wallets;

DELETE FROM transactions WHERE transaction_type = 'TOPUP';

ALTER TABLE transactions DROP CHECK chk_transactions_targets;

ALTER TABLE transactions
    MODIFY transaction_type ENUM('SUBSCRIPTION', 'ARTICLE', 'AD', 'REFUND') NOT NULL;

ALTER TABLE transactions ADD CONSTRAINT chk_transactions_targets CHECK (
    (transaction_type = 'SUBSCRIPTION' AND subscription_id IS NOT NULL AND purchase_id IS NULL AND campaign_id IS NULL AND original_transaction_id IS NULL) OR
    (transaction_type = 'ARTICLE' AND purchase_id IS NOT NULL AND subscription_id IS NULL AND campaign_id IS NULL AND original_transaction_id IS NULL) OR
    (transaction_type = 'AD' AND campaign_id IS NOT NULL AND subscription_id IS NULL AND purchase_id IS NULL AND original_transaction_id IS NULL) OR
    (transaction_type = 'REFUND' AND original_transaction_id IS NOT NULL AND subscription_id IS NULL AND purchase_id IS NULL AND campaign_id IS NULL)
);

ALTER TABLE transactions
    DROP INDEX idx_transactions_topup_for_order,
    DROP COLUMN topup_for_order;

ALTER TABLE reconciliation_items
    MODIFY action ENUM('ASSIGN_ORDER', 'CREDIT_WALLET', 'EXPLAINED', 'RETURNED_TO_CUSTOMER') NULL;

UPDATE reconciliation_items SET action = 'EXPLAINED' WHERE action = 'CREDIT_WALLET';

ALTER TABLE reconciliation_items
    MODIFY action ENUM('ASSIGN_ORDER', 'RETURNED_TO_CUSTOMER', 'EXPLAINED') NULL;
