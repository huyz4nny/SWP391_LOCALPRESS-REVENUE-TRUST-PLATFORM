package com.localpress.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CoverImageInfoRequest(
        @Size(max = 500, message = "Chú thích ảnh tối đa 500 ký tự")
        String caption,

        @NotBlank(message = "Vui lòng nhập văn bản thay thế cho ảnh")
        @Size(max = 300, message = "Alt text tối đa 300 ký tự")
        String altText,

        @Size(max = 300, message = "Nguồn ảnh tối đa 300 ký tự")
        String imageSource
) {
}
