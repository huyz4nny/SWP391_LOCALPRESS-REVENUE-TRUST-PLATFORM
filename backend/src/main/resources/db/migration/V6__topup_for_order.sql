-- =============================================================================
-- V6: NẠP BÙ GẮN VỚI ĐƠN — MỌI THANH TOÁN ĐI QUA VÍ (SV4 - Huy, UC047, UC049)
-- =============================================================================
-- Từ 22/10/2026 khách luôn trả đơn (bài, gói, quảng cáo) bằng Ví LocalPress.
-- Ví thiếu tiền: trang thanh toán tạo 1 đơn TOPUP đúng bằng phần còn thiếu, ghi mã đơn cần trả vào
-- topup_for_order. Khi SePay báo tiền nạp về, hệ thống cộng ví rồi tự trừ ví để trả đơn đó.
-- Đơn TOPUP vẫn không gắn subscription/purchase/campaign nên CHECK chk_transactions_targets (V3) giữ nguyên.
-- =============================================================================

ALTER TABLE transactions
    ADD COLUMN topup_for_order VARCHAR(255) NULL AFTER description,
    ADD INDEX idx_transactions_topup_for_order (topup_for_order, status);
