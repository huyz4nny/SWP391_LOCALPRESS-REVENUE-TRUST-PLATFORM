package com.localpress.editorial.dto;

import lombok.*;

import java.math.BigDecimal;

/**
 * Request body cho UC027 (Thiết lập chính sách bài viết Free/Premium & Giá bán lẻ).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateArticlePolicyRequest {

    /**
     * Loại truy cập: FREE hoặc PREMIUM
     */
    private String accessType;

    /**
     * Giá bán lẻ từng bài (VND) - bắt buộc nếu là PREMIUM, = 0 nếu là FREE
     */
    private BigDecimal singlePrice;
}
