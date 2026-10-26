package com.localpress.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateArticleVersionContentRequest(
        @NotBlank(message = "Vui lòng nhập tiêu đề")
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        String title,

        @Size(max = 2000, message = "Sapo tối đa 2000 ký tự")
        String sapo,

        @NotNull(message = "Nội dung không được null")
        @Size(max = 100000, message = "Nội dung tối đa 100000 ký tự")
        String content,

        @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
        String changelog
) {}
