package com.localpress.content.dto;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;

import java.util.Map;

public record ArticleDraftDetailResponse(
        String id,
        String categoryId,
        String slug,
        String status,
        Integer latestVersion,
        String title,
        String sapo,
        String content,
        String source,
        String coverImageUrl,
        String coverCaption,
        String coverAltText,
        String coverSource
) {

    public static ArticleDraftDetailResponse from(
            Article article,
            ArticleVersion version
    ) {
        Map<String, Object> metadata = version.getMetadata();

        return new ArticleDraftDetailResponse(
                article.getId().toString(),
                article.getCategoryId().toString(),
                article.getSlug(),
                article.getStatus().name(),
                article.getLatestVersion(),
                version.getTitle(),
                version.getSapo(),
                version.getContent(),
                getString(metadata, "source"),
                version.getCoverImageUrl(),
                getString(metadata, "coverCaption"),
                getString(metadata, "coverAltText"),
                getString(metadata, "coverSource")
        );
    }

    private static String getString(
            Map<String, Object> metadata,
            String key
    ) {
        Object value = metadata == null ? null : metadata.get(key);

        return value instanceof String ? (String) value : null;
    }
}