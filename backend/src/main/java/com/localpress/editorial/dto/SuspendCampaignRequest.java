package com.localpress.editorial.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request dừng khẩn cấp chiến dịch quảng cáo (Emergency Kill-Switch - UC024, Rule 9).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuspendCampaignRequest {

    @NotBlank(message = "Lý do đình chỉ phát sóng không được để trống")
    private String reason;
}
