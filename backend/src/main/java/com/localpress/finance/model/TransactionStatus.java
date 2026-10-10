package com.localpress.finance.model;

/**
 * ==============================================================================
 * ENUM: TRẠNG THÁI GIAO DỊCH TÀI CHÍNH (TRANSACTION STATUS)
 * ==============================================================================
 * Khớp 100% với ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') trong DB.
 */
public enum TransactionStatus {
    /**
     * Giao dịch đang chờ thanh toán hoặc đang chờ Kế toán xác nhận chuyển khoản thủ công.
     */
    PENDING,

    /**
     * Giao dịch đã thanh toán thành công, tiền đã vào tài khoản tòa soạn.
     */
    SUCCESS,

    /**
     * Giao dịch thất bại (quá hạn giữ chỗ, sai cú pháp, hoặc bị Kế toán từ chối).
     */
    FAILED,

    /**
     * Giao dịch đã được hoàn tiền lại cho khách hàng theo quy trình 4 mắt.
     */
    REFUNDED
}
