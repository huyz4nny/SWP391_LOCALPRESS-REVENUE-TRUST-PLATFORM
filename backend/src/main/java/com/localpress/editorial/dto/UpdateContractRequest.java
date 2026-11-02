package com.localpress.editorial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request cập nhật thông tin hợp đồng quảng cáo (UC019).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateContractRequest {

    @NotBlank(message = "Mã số hợp đồng không được để trống")
    @Size(max = 100, message = "Mã số hợp đồng tối đa 100 ký tự")
    private String contractReference;

    @Size(max = 1000, message = "Đường dẫn file hợp đồng tối đa 1000 ký tự")
    private String contractFileUrl;
}
