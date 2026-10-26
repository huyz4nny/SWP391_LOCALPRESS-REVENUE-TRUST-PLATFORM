package com.localpress.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record RestoreArticleVersionRequest(
        @NotNull(message = "Thiếu số phiên bản mới nhất")
        @Positive(message = "Số phiên bản phải lớn hơn 0")
        Integer expectedLatestVersion,

        @NotBlank(message = "Vui lòng nhập lý do khôi phục")
        @Size(max = 1000, message = "Lý do tối đa 1000 ký tự")
        String changelog
) {
}
