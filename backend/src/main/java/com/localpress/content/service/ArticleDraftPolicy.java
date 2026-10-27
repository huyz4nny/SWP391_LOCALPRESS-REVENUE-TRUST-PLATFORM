package com.localpress.content.service;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

public final class ArticleDraftPolicy {
    private ArticleDraftPolicy() {}

    public static void requireEditable(Article article, ArticleVersion version) {
        boolean allowedArticleStatus = article.getStatus() == Article.Status.DRAFT
                || article.getStatus() == Article.Status.PUBLISHED;

        boolean belongsToArticle = Objects.equals(version.getArticleId(), article.getId());

        boolean latestVersion = Objects.equals(version.getVersionNumber(), article.getLatestVersion());

        boolean draftVersion =
                version.getReviewStatus()
                        == ArticleVersion.ReviewStatus.DRAFT;

        boolean newerThanPublished =
                article.getPublishedVersion() == null
                        || version.getVersionNumber()
                        > article.getPublishedVersion();

        boolean validPublishedArticle =
                article.getStatus() != Article.Status.PUBLISHED
                        || article.getPublishedVersion() != null;

        if(!allowedArticleStatus || !belongsToArticle || !latestVersion
        || !draftVersion || !newerThanPublished || !validPublishedArticle){
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Chỉ được chỉnh sửa bản nháp mới nhất, chưa xuất bản");
        }
    }
}
