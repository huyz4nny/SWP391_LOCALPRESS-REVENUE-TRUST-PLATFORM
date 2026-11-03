-- =============================================================================
-- V13: BỎ NHẮC NỢ QUẢNG CÁO (SV4 - Huy, UC053)
-- =============================================================================
-- Doanh nghiệp quảng cáo không được chạy nợ: booking chỉ chạy khi đã trả đủ qua QR SePay
-- (02/11/2026). Không còn công nợ phải thu nên bỏ màn hình Công nợ quảng cáo và bảng
-- lịch sử nhắc nợ (V11). Bảng của SV4 còn 6: transactions, refund_requests,
-- payment_complaints, sepay_webhook_logs, reconciliation_periods, reconciliation_items.
-- =============================================================================

DROP TABLE IF EXISTS receivable_reminders;
