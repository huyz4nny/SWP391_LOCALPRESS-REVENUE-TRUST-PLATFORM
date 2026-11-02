package com.localpress.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// chỉ nhận họ tên và số điện thoại của chính người đang đăng nhập
// email, role, status và userId không có trong body
public record UpdateProfileRequest(
        @NotBlank(message = "Vui lòng nhập họ tên")
        @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
        String fullName,

        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
        String phone
) {
}
