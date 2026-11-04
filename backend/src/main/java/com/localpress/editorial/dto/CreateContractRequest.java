package com.localpress.editorial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request tạo mới hồ sơ hợp đồng quảng cáo B2B phía Tòa soạn (Màn II.2.9 - UC019).
 * Đầy đủ 4 thông tin nghiệp vụ: số hợp đồng, ngày ký, giá trị, file đính kèm.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateContractRequest {

    @NotNull(message = "Mã chiến dịch không được để trống")
    private Long campaignId;

    @NotBlank(message = "Số hợp đồng không được để trống")
    private String contractNumber;

    @NotNull(message = "Ngày ký hợp đồng không được để trống")
    private LocalDate signingDate;

    @NotNull(message = "Giá trị hợp đồng không được để trống")
    @Positive(message = "Giá trị hợp đồng phải lớn hơn 0")
    private BigDecimal contractValue;

    private String contractFileUrl;

    private String notes;
}
