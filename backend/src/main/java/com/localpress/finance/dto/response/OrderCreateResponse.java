package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * DTO: PHẢN HỒI KHỞI TẠO ĐƠN THANH TOÁN (SV4 - UC047)
 * ==============================================================================
 * Cung cấp đầy đủ:
 * 1. Mã đơn và trạng thái lưu trong CSDL `transactions`.
 * 2. Link ảnh VietQR chuẩn Napas (`qrCodeUrl`) để render trực tiếp tại popup của LocalPress.
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

    /** Đơn TOPUP nạp bù: mã đơn sẽ được tự trả khi tiền nạp về. */
    private String topupForOrder;
}
