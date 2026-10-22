package com.localpress.content.dto;

import java.time.LocalDateTime;

public record MyArticleResponse(
        String id,
        String title,
        String authorId,
        String authorName,
        String categoryName,
        boolean isPremium,
        String status,
        Integer currentVersion,
        LocalDateTime updatedAt,
        String reviewNotes,

        // Trạng thái của phiên bản mới nhất.
        String latestReviewStatus,

        // Phiên bản được chọn xuất bản, không nhất thiết là bản mới nhất.
        Integer publishedVersion
) {}