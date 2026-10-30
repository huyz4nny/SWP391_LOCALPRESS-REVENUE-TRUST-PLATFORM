-- =============================================================================
-- V9: Tra nhật ký SePay theo mã giao dịch ngân hàng (SV4 - UC051)
-- =============================================================================
-- Khi kế toán ghi nhận khiếu nại, hệ thống tìm mã GD trong sepay_webhook_logs để biết
-- khoản tiền đã được webhook ghi nhận chưa (chặn cộng tiền 2 lần).

CREATE INDEX idx_sepay_logs_reference ON sepay_webhook_logs (reference_code);
