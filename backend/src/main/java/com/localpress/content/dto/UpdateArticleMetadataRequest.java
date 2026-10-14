package com.localpress.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record UpdateArticleMetadataRequest(

        @NotNull(message = "Vui lòng chọn chuyên mục")
        @Positive(message = "Mã chuyên mục phải lớn hơn 0")
        Long categoryId,

        @NotBlank(message = "Vui lòng nhập slug")
        @Size(max = 280, message = "Slug tối đa 280 ký tự")
        @Pattern(
                regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                message = "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang giữa các từ"
        )
        String slug
) {
}
