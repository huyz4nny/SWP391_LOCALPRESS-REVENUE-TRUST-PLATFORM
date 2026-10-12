package com.localpress.editorial.dto;

import lombok.*;

/**
 * Request body cho thao tác duyệt/từ chối bình luận (UC026).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerateCommentRequest {

    /**
     * Trạng thái duyệt: APPROVED, REJECTED, HIDDEN
     */
    private String status;

    /**
     * Lý do từ chối hoặc ghi chú vi phạm chính sách
     */
    private String reason;
}
