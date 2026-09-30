package com.localpress.finance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ==============================================================================
 * DTO REQUEST: KẾ TOÁN TỪ CHỐI GIAO DỊCH CHUYỂN KHOẢN (UC051)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualTransferRejectRequest {

    /**
     * Lý do từ chối giao dịch (Bắt buộc nhập để thông báo lại cho khách hàng).
     */
    @NotBlank(message = "Lý do từ chối không được để trống")
    @Size(max = 1000, message = "Lý do từ chối không được vượt quá 1000 ký tự")
    private String rejectionReason;
}
