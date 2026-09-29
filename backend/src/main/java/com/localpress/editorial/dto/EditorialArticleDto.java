package com.localpress.editorial.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO trả về thông tin bài viết và lịch sử phiên bản cho màn hình
 * Article Review and Publishing (UC025) của SV2.
 * Khớp 100% với kiểu dữ liệu Article của React Frontend.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditorialArticleDto {

    private String id;
    private String title;
    private String slug;
    private String sapo;
    private String content;
    private String previewContent;
    private String authorId;
    private String authorName;
    private String categoryId;
    private String categoryName;
    private String categorySlug;
    private String coverImage;
    private List<String> tags;
    @JsonProperty("isPremium")
    private boolean isPremium;
    private BigDecimal price;
    /**
     * Trạng thái hiển thị trên UI:
     * DRAFT, IN_REVIEW, CHANGES_REQUESTED, APPROVED, PUBLISHED, UNPUBLISHED
     */
    private String status;
    private String dbStatus;
    private String reviewNotes;
    private Long views;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int readTimeMinutes;
    private Integer currentVersion;
    private Integer publishedVersion;
    private List<VersionDto> versions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VersionDto {
        private Integer versionNumber;
        private String title;
        private String sapo;
        private String content;
        private String changelog;
        private String reviewStatus;
        private LocalDateTime createdAt;
        private String createdBy;
    }
}
