package com.localpress.finance.model;

/**
 * ==============================================================================
 * ENUM: PHÂN LOẠI GIAO DỊCH TÀI CHÍNH (TRANSACTION TYPE)
 * ==============================================================================
 * Khớp 100% với ràng buộc ENUM('SUBSCRIPTION', 'ARTICLE', 'AD', 'REFUND')
 * trong bảng CSDL transactions (V12__remove_wallet.sql bỏ loại TOPUP của ví).
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
    REFUND;

    /** Đơn mua (bài, gói, quảng cáo): loại duy nhất được thanh toán qua QR và được hoàn tiền. */
    public boolean isPurchase() {
        return this != REFUND;
    }
}
