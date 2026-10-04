package com.localpress.content.dto;

import com.localpress.content.entity.Article;

public record ArticleDraftResponse(String id, String slug, String status, Integer latestVersion) {
    public static ArticleDraftResponse from(Article article) {
        return new ArticleDraftResponse(article.getId().toString(),
                article.getSlug(),
                article.getStatus().name(),
                article.getLatestVersion());
    }
}
