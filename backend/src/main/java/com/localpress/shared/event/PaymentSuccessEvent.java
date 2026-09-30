package com.localpress.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * HỢP ĐỒNG SỰ KIỆN MIỀN (SHARED DOMAIN EVENT): THANH TOÁN THÀNH CÔNG
 * ==============================================================================
 * - Mục đích: Đóng vai trò là cầu nối lỏng lẻo (Decoupled Bridge) giữa phân hệ Finance (SV4)
 *   và các phân hệ nghiệp vụ khác (SV1 - Advertising, SV3 - Reader).
 * - Cơ chế: Khi Kế toán duyệt chuyển khoản thủ công (hoặc Webhook IPN ở Iter 2 nhận tiền),
 *   Finance sẽ publish sự kiện này qua Spring ApplicationEventPublisher.
 * - Tuân thủ Quy tắc 17: SV4 không cần gọi trực tiếp Repository/Service của SV1 hay SV3.
 *   Phân hệ nào cần xử lý khi có tiền (mở khóa bài viết, active chiến dịch) sẽ tự viết
 *   @EventListener để đón nhận sự kiện này.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSuccessEvent {

    /**
     * Mã định danh duy nhất của giao dịch thanh toán trong bảng transactions.
     */
    private Long transactionId;

    /**
     * ID của người dùng hoặc doanh nghiệp thực hiện thanh toán.
     */
    private Long userId;

    /**
     * Phân loại giao dịch: SUBSCRIPTION (Gói cước), ARTICLE (Mua bài lẻ), AD (Quảng cáo B2B), REFUND (Hoàn tiền).
     */
    private String transactionType;

    /**
     * ID của đối tượng nghiệp vụ tương ứng:
     * - Nếu transactionType = "SUBSCRIPTION" -> subscription_id
     * - Nếu transactionType = "ARTICLE"      -> purchase_id
     * - Nếu transactionType = "AD"           -> campaign_id
     */
    private Long targetId;

    /**
     * Số tiền thực tế đã thanh toán thành công (VND).
     */
    private BigDecimal amount;

    /**
     * Đơn vị tiền tệ (mặc định VND).
     */
    private String currency;

    /**
     * Phương thức thanh toán (vd: "MANUAL_BANK_TRANSFER", "VIETQR", "MOMO", "VNPAY").
     */
    private String paymentMethod;

    /**
     * Mã bút toán ngân hàng hoặc mã tham chiếu từ cổng thanh toán đối soát.
     */
    private String gatewayTransactionId;

    /**
     * Thời điểm giao dịch được ghi nhận thanh toán thành công.
     */
    private LocalDateTime paidAt;
}
