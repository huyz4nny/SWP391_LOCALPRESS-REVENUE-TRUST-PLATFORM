package com.localpress.editorial.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request từ chối booking quảng cáo (Màn II.2.3 - UC016).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RejectBookingRequest {
    @NotBlank(message = "Vui lòng nhập lý do từ chối")
    private String reason;
}
