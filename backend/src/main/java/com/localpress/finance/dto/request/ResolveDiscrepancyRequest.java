package com.localpress.finance.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ==============================================================================
 * DTO: GIẢI QUYẾT SAI LỆCH ĐỐI SOÁT (SV4 - UC054)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolveDiscrepancyRequest {

    @NotBlank(message = "ID sai lệch không được để trống")
    private String discrepancyId;

    @NotBlank(message = "Ghi chú giải quyết không được để trống")
    private String note;
}
