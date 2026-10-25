package com.localpress.finance.model;

/**
 * ==============================================================================
 * ENUM: PHÂN LOẠI GIAO DỊCH TÀI CHÍNH (TRANSACTION TYPE)
 * ==============================================================================
 * Khớp 100% với ràng buộc ENUM('SUBSCRIPTION', 'ARTICLE', 'AD', 'REFUND', 'TOPUP')
 * trong bảng CSDL transactions (V1__create_tables.sql + V3__wallet_and_topup.sql).
 */
public enum TransactionType {
    /**
     * Doanh thu B2C: Độc giả đăng ký mua gói cước hội viên (tháng, quý, năm).
     */
    SUBSCRIPTION,

    /**
     * Doanh thu B2C: Độc giả mua lẻ từng bài viết điều tra / chuyên sâu (Paywall).
     */
    ARTICLE,

    /**
     * Doanh thu B2B: Doanh nghiệp đặt vị trí banner quảng cáo (Ad Campaign Booking).
     */
    AD,

    /**
     * Nghiệp vụ tài chính: Hoàn tiền giao dịch theo nguyên tắc 4 mắt (SV4).
     */
    REFUND,

    /**
     * Nạp tiền vào Ví LocalPress qua QR SePay. Không gắn đối tượng nghiệp vụ nào.
     * Là công nợ phải trả khách, KHÔNG tính vào doanh thu (doanh thu ghi nhận khi tiêu ví).
     */
    TOPUP
}
