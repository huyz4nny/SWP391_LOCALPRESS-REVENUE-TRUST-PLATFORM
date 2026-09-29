package com.localpress.editorial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import org.aspectj.bridge.IMessage;

public record CreateArticleDraftRequest(
        @NotNull(message = "Vui lòng chọn chuyên mục")
        @Positive(message = "Mã chuyên mục phải lớn hơn 0")
        Long categoryId,

        @NotBlank(message = "Vui lòng nhập tiêu đề")
        @Size(max = 255, message = "Tiêu đề tối đa 225 ký tự")
        String title,

        @Size(max = 2000, message = "Sapo tối đa 2000 ký tự")
        String sapo,

        @NotNull(message = "Nội dung không được null")
        @Size(max = 100000, message = "Nội dung tối đa 100000 ký tự")
        String content,

        @Size(max = 1000, message = "Nguồn tối đa 1000 ký tự")
        String source
) {
}
