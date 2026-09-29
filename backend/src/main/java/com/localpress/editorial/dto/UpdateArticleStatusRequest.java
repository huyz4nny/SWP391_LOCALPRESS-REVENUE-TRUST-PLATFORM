package com.localpress.editorial.dto;

import lombok.*;

import java.math.BigDecimal;

/**
 * Request DTO khi Tổng biên tập / Biên tập viên (SV2) thực hiện:
 * - Duyệt bài (APPROVED)
 * - Yêu cầu sửa / Từ chối (CHANGES_REQUESTED / REJECTED)
 * - Xuất bản lên báo (PUBLISHED)
 * - Gỡ bài (UNPUBLISHED / TAKEN_DOWN)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateArticleStatusRequest {

    /**
     * Trạng thái đích: APPROVED, CHANGES_REQUESTED (hoặc REJECTED),
     * PUBLISHED, UNPUBLISHED (hoặc TAKEN_DOWN), IN_REVIEW (hoặc PENDING)
     */
    private String status;

    /**
     * Ghi chú kiểm duyệt / Lý do yêu cầu phóng viên chỉnh sửa
     */
    private String reviewNotes;

    /**
     * Tùy chọn cập nhật chính sách bài viết khi duyệt xuất bản: FREE hoặc PREMIUM (UC027)
     */
    private String accessType;

    /**
     * Giá bán lẻ bài viết nếu là PREMIUM (VD: 15000)
     */
    private BigDecimal singlePrice;
}
