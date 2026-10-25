package com.localpress.finance.model;

/**
 * ==============================================================================
 * ENUM: TRẠNG THÁI PHÊ DUYỆT HOÀN TIỀN 4 MẮT (REFUND STATUS)
 * ==============================================================================
 * Khớp 100% với ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')
 * trong bảng CSDL refund_requests theo V1__create_tables.sql.
 */
public enum RefundStatus {
    /**
     * Mắt 1 & 2: Kế toán viên đã lập đề xuất, đang chờ Kế toán trưởng phê duyệt.
     */
    PENDING,

    /**
     * Mắt 3 & 4: Kế toán trưởng đã phê duyệt đề xuất hoàn tiền.
     */
    APPROVED,

    /**
     * Kế toán trưởng từ chối đề xuất hoàn tiền.
     */
    REJECTED,

    /**
     * Tiền đã được hoàn tất chuyển trả về tài khoản độc giả / khách hàng.
     */
    COMPLETED
}
