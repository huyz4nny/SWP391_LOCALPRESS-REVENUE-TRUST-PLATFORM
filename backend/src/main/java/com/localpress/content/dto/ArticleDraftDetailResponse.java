package com.localpress.content.dto;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;

public record ArticleDraftDetailResponse(String id, String categoryId, String slug,
                                         String status, Integer latestVersion, String title,
                                         String sapo, String content, String source) {
    public static ArticleDraftDetailResponse from(Article article, ArticleVersion version) {
        Object sourceValue = version.getMetadata() == null
                ? null
                : version.getMetadata().get("source");

        String source = sourceValue instanceof String
                ? (String) sourceValue
                :null;

        return new ArticleDraftDetailResponse(
                article.getId().toString(),
                article.getCategoryId().toString(),
                article.getSlug(),
                article.getStatus().name(),
                article.getLatestVersion(),
                version.getTitle(),
                version.getSapo(),
                version.getContent(),
                source);
    }
}
