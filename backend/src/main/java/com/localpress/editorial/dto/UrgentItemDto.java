package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO đại diện cho một mục việc khẩn cấp trong hàng đợi điều hành tòa soạn (Màn II.2.10 - UC015, UC028).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UrgentItemDto {

    private String id;
    private String type; // ARTICLE, BOOKING, CREATIVE, COMMENT
    private String title;
    private String description;
    private String priority; // HIGH, URGENT, NORMAL
    private String link;
    private LocalDateTime createdAt;
}
