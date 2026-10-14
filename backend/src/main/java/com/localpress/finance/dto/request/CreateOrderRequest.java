package com.localpress.finance.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * ==============================================================================
 * DTO: YÊU CẦU TẠO ĐƠN THANH TOÁN DÙNG CHUNG (SV4 - UC047)
 * ==============================================================================
 * Dùng chung cho:
 * - Độc giả mua bài lẻ hoặc mua gói đọc báo (SV3)
 * - Doanh nghiệp thanh toán booking vị trí quảng cáo (SV1)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequest {

    /**
     * Loại đơn hàng: SUBSCRIPTION (Gói cước), ARTICLE (Mua bài lẻ), AD (Chiến dịch quảng cáo)
     */
    @NotBlank(message = "Loại đơn hàng không được để trống (SUBSCRIPTION, ARTICLE, AD)")
    private String orderType;

    /**
     * ID đối tượng liên quan trong CSDL:
     * - SUBSCRIPTION: subscription_id
     * - ARTICLE: purchase_id
     * - AD: campaign_id
     */
    @NotNull(message = "Target ID không được để trống")
    private Long targetId;

    /**
     * Số tiền thanh toán thực tế (VNĐ).
     */
    @NotNull(message = "Số tiền thanh toán không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền tối thiểu là 1.000 VNĐ")
    private BigDecimal amount;

    /**
     * Phương thức thanh toán: 'SEPAY', 'VIETQR', 'MANUAL_BANK_TRANSFER'. Mặc định: 'SEPAY'.
     */
    @Builder.Default
    private String paymentMethod = "SEPAY";

    /**
     * Ngân hàng thụ hưởng (mặc định VCB).
     */
    @Builder.Default
    private String bankCode = "VCB";

    /**
     * Diễn giải / ghi chú đơn hàng hiển thị trên cổng thanh toán.
     */
    private String description;

    /**
     * URL chuyển hướng trên trình duyệt khi thanh toán thành công.
     */
    private String successUrl;

    /**
     * URL chuyển hướng khi phát sinh lỗi.
     */
    private String errorUrl;

    /**
     * URL chuyển hướng khi người dùng hủy giao dịch.
     */
    private String cancelUrl;
}
