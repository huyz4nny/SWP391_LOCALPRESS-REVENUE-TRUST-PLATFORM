package com.localpress.finance.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO: Yêu cầu nạp tiền vào Ví LocalPress. Hạn mức min/max kiểm tra ở PaymentProcessingService
 * theo cấu hình localpress.payment.topup-*.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopUpRequest {

    @NotNull(message = "Vui lòng chọn số tiền cần nạp")
    private BigDecimal amount;
}
