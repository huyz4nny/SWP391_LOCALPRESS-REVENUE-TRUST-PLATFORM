package com.localpress.editorial.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request gửi báo giá quảng cáo (Màn II.2.5 - UC018).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendQuotationRequest {
    @NotNull(message = "Giá báo giá không được để trống")
    @Positive(message = "Giá báo giá phải lớn hơn 0")
    private BigDecimal finalPrice;

    @DecimalMin(value = "0.0", message = "Chiết khấu không được âm")
    @DecimalMax(value = "100.0", message = "Chiết khấu tối đa 100%")
    private BigDecimal discountPercent;

    private String quotationNotes;
}
