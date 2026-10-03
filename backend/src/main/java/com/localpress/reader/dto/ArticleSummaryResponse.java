package com.localpress.reader.dto;

import java.time.LocalDateTime;

public class ArticleSummaryResponse {
    private Long articleId;
    private String title;
    private String summary;
    private String categoryName;
    private String accessType; // FREE hoặc PREMIUM
    private String thumbnailUrl;
    private LocalDateTime publishedAt;

    public ArticleSummaryResponse() {
    }

    public ArticleSummaryResponse(Long articleId, String title, String summary, String categoryName,
                                  String accessType, String thumbnailUrl, LocalDateTime publishedAt) {
        this.articleId = articleId;
        this.title = title;
        this.summary = summary;
        this.categoryName = categoryName;
        this.accessType = accessType;
        this.thumbnailUrl = thumbnailUrl;
        this.publishedAt = publishedAt;
    }

    public Long getArticleId() {
        return articleId;
    }

    public void setArticleId(Long articleId) {
        this.articleId = articleId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public String getAccessType() {
        return accessType;
    }

    public void setAccessType(String accessType) {
        this.accessType = accessType;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public LocalDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(LocalDateTime publishedAt) {
        this.publishedAt = publishedAt;
    }
}