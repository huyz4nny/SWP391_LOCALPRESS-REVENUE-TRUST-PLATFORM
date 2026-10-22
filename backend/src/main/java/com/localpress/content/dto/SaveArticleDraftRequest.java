package com.localpress.content.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

/** Editor fields only; owner, status and version are controlled by the server. */
public record SaveArticleDraftRequest(
        @NotNull(message = "Vui lòng chọn chuyên mục")
        @Positive(message = "Mã chuyên mục phải lớn hơn 0") Long categoryId,
        @NotBlank(message = "Vui lòng nhập tiêu đề bài viết")
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự") String title,
        @NotBlank(message = "Vui lòng nhập đoạn mở đầu (Sapo)")
        @Size(max = 2000, message = "Sapo tối đa 2000 ký tự") String sapo,
        @NotBlank(message = "Vui lòng nhập nội dung bài viết")
        @Size(max = 100000, message = "Nội dung tối đa 100000 ký tự") String content,
        @Size(max = 1000, message = "URL ảnh tối đa 1000 ký tự") String coverImageUrl,
        @Size(max = 50, message = "Tối đa 50 thẻ tag")
        List<@NotBlank(message = "Thẻ tag không được trống")
                @Size(max = 100, message = "Mỗi thẻ tag tối đa 100 ký tự") String> tags,
        Boolean isPremium,
        @DecimalMin(value = "0", message = "Giá không được âm")
        @Digits(integer = 10, fraction = 2, message = "Giá tối đa 10 chữ số nguyên và 2 chữ số thập phân") BigDecimal price,
        @Size(max = 2000, message = "Ghi chú thay đổi tối đa 2000 ký tự") String changelog,
        @Valid CoverImageInfoRequest imageInfo
) {
    @AssertTrue(message = "Bài Premium cần giá lớn hơn 0")
    public boolean isPremiumPriceValid() {
        return !Boolean.TRUE.equals(isPremium) || (price != null && price.signum() > 0);
    }
}
