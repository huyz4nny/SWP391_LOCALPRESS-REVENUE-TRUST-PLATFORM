-- =============================================================================
-- KHIẾU NẠI: SỐ TIỀN ĐÃ CHUYỂN TRẢ LẠI KHÁCH (SV4 - Huy, UC051)
-- =============================================================================
-- Khách chuyển thừa cho đơn còn chờ: kế toán ghi đơn đúng số tiền đơn và chuyển trả
-- phần thừa (resolution = EXCESS_RETURNED). Chuyển trả toàn bộ (RETURNED_TO_CUSTOMER)
-- thì returned_amount = amount. NULL: không chuyển trả gì (ghi đủ vào đơn / từ chối).
-- =============================================================================

ALTER TABLE payment_complaints
    ADD COLUMN returned_amount DECIMAL(12,2) NULL AFTER resolution_note;
