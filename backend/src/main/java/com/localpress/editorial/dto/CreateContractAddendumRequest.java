package com.localpress.editorial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Request tạo phụ lục hợp đồng quảng cáo (UC019).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateContractAddendumRequest {

    @NotBlank(message = "Số phụ lục hợp đồng không được để trống")
    @Size(max = 100, message = "Số phụ lục hợp đồng tối đa 100 ký tự")
    private String addendumNumber;

    @NotNull(message = "Ngày hiệu lực của phụ lục không được để trống")
    private LocalDate effectiveDate;

    @NotBlank(message = "Loại điều chỉnh không được để trống")
    @Size(max = 100, message = "Loại điều chỉnh tối đa 100 ký tự")
    private String adjustmentType;

    private String notes;
}
