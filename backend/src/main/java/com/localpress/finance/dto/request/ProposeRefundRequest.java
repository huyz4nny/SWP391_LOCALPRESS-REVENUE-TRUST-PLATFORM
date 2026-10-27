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
 * DTO: ĐỀ XUẤT HOÀN TIỀN (SV4 - UC055)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposeRefundRequest {

    /**
     * ID đơn hàng / giao dịch gốc cần hoàn tiền.
     */
    @NotNull(message = "Mã giao dịch không được để trống")
    private Long orderId;

    /**
     * Số tiền yêu cầu hoàn lại cho khách (VNĐ).
     */
    @NotNull(message = "Số tiền hoàn không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền hoàn tối thiểu là 1.000 VNĐ")
    private BigDecimal refundAmount;

    /**
     * Diễn giải lý do đề xuất hoàn tiền.
     */
    @NotBlank(message = "Lý do hoàn tiền không được để trống")
    private String reason;

    /**
     * Mô tả quyền lợi bị thu hồi (ví dụ: Hủy quyền đọc phóng sự Sơn Dương).
     */
    private String affectedBenefit;

    /**
     * Link ảnh ủy nhiệm chi hoặc chứng từ sai sót.
     */
    private String evidenceUrl;
}
