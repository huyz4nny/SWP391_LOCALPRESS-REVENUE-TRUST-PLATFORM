package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * ==============================================================================
 * DTO: PHẢN HỒI KHỞI TẠO ĐƠN THANH TOÁN (SV4 - UC047)
 * ==============================================================================
 * Cung cấp đầy đủ:
 * 1. Mã đơn và trạng thái lưu trong CSDL `transactions`.
 * 2. Cấu hình chuyển hướng sang Cổng thanh toán SePay PG (`checkoutUrl` + `checkoutFields`).
 * 3. Link ảnh VietQR chuẩn Napas (`qrCodeUrl`) để render trực tiếp tại popup của LocalPress.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreateResponse {

    private Long transactionId;

    private String orderCode;

    private BigDecimal amount;

    private String currency;

    private String status;

    private String paymentMethod;

    private String description;

    /**
     * URL chuyển hướng hoặc action form sang Cổng thanh toán SePay:
     * - Production: https://pay.sepay.vn/v1/checkout/init
     * - Sandbox: https://pay-sandbox.sepay.vn/v1/checkout/init
     */
    private String checkoutUrl;

    /**
     * Các trường dữ liệu form kèm chữ ký số HMAC-SHA256 (signature)
     * để Frontend render hidden inputs và tự động submit sang SePay.
     */
    private Map<String, Object> checkoutFields;

    /**
     * Link ảnh VietQR chuẩn Napas sinh động (quét được bằng app ngân hàng thật).
     */
    private String qrCodeUrl;

    private LocalDateTime createdAt;

    // --- Dữ liệu hiển thị trên trang thanh toán chung /payment/:orderCode ---

    /** SUBSCRIPTION | ARTICLE | AD | TOPUP */
    private String orderType;

    private Long targetId;

    private boolean isPaid;

    private boolean expired;

    private LocalDateTime paidAt;

    /** Hạn hiệu lực mã QR, Frontend dùng để đếm ngược. */
    private LocalDateTime expiresAt;

    /** Thông tin chuyển khoản (lấy từ cấu hình localpress.sepay.*), nội dung CK bắt buộc = orderCode. */
    private String bankCode;

    private String accountNumber;

    private String accountName;

    private String transferContent;
}
