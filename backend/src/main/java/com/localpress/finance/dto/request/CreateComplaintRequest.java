package com.localpress.finance.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO: Khách gửi khiếu nại "đã chuyển tiền nhưng chưa được ghi nhận".
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateComplaintRequest {

    /** Mã đơn LP... đang thanh toán (không bắt buộc). */
    @Size(max = 255)
    private String orderCode;

    @NotNull(message = "Vui lòng nhập số tiền đã chuyển")
    @DecimalMin(value = "1000", message = "Số tiền tối thiểu 1.000 VND")
    private BigDecimal amount;

    @NotNull(message = "Vui lòng nhập thời gian chuyển khoản")
    @PastOrPresent(message = "Thời gian chuyển khoản không được ở tương lai")
    private LocalDateTime transferredAt;

    @NotBlank(message = "Vui lòng nhập mã giao dịch trên biên lai ngân hàng")
    @Size(max = 100)
    private String bankReference;

    @Size(max = 500)
    private String note;
}
