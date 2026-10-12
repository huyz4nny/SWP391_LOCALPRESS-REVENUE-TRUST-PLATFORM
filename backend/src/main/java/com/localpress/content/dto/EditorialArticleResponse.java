package com.localpress.content.dto;

import java.math.BigDecimal;
import java.util.List;

public record EditorialArticleResponse(
        String id, String title, String slug, String sapo, String content, String previewContent,
        String authorId, String authorName, String categoryId, String categoryName, String categorySlug,
        String coverImage, String coverCaption, String coverAltText, String coverSource,
        List<String> tags, boolean isPremium, BigDecimal price, String status,
        String reviewNotes, long views, String publishedAt, String scheduledFor,
        String createdAt, String updatedAt, int readTimeMinutes, int currentVersion,
        List<VersionResponse> versions
) {
    public record VersionResponse(
            int versionNumber, String title, String sapo, String content,
            String changelog, String createdAt, String createdBy
    ) {}
}
