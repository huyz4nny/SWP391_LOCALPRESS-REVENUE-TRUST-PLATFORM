package com.localpress.content.dto;

import java.time.LocalDateTime;

public record MyArticleResponse(
        String id, String title, String authorId, String authorName,
        String categoryName, boolean isPremium, String status,
        Integer currentVersion, LocalDateTime updatedAt, String reviewNotes
) {}
