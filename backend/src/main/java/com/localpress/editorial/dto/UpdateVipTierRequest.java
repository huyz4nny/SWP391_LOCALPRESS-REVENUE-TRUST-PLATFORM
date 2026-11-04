package com.localpress.editorial.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request cập nhật phân hạng khách hàng doanh nghiệp VIP B2B (UC019, UC025).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateVipTierRequest {

    @NotBlank(message = "Hạng VIP không được để trống")
    private String vipTier; // STANDARD, SILVER, GOLD, DIAMOND

    @NotNull(message = "Tỷ lệ chiết khấu VIP không được để trống")
    @DecimalMin(value = "0.00", message = "Chiết khấu tối thiểu là 0%")
    @DecimalMax(value = "50.00", message = "Chiết khấu tối đa là 50%")
    private BigDecimal vipDiscountPercent;

    private String notes;
}
