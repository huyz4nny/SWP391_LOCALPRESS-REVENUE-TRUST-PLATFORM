package com.localpress.reader.dto;

import java.time.LocalDateTime;

public class ArticleReaderResponse {
    private Long articleId;
    private String title;
    private String summary;
    private String content;
    private String accessType;
    private boolean hasFullAccess;
    private String paywallMessage;
    private LocalDateTime publishedAt;

    public ArticleReaderResponse() {
    }

    public ArticleReaderResponse(Long articleId, String title, String summary, String content,
                                 String accessType, boolean hasFullAccess, String paywallMessage,
                                 LocalDateTime publishedAt) {
        this.articleId = articleId;
        this.title = title;
        this.summary = summary;
        this.content = content;
        this.accessType = accessType;
        this.hasFullAccess = hasFullAccess;
        this.paywallMessage = paywallMessage;
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

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getAccessType() {
        return accessType;
    }

    public void setAccessType(String accessType) {
        this.accessType = accessType;
    }

    public boolean isHasFullAccess() {
        return hasFullAccess;
    }

    public void setHasFullAccess(boolean hasFullAccess) {
        this.hasFullAccess = hasFullAccess;
    }

    public String getPaywallMessage() {
        return paywallMessage;
    }

    public void setPaywallMessage(String paywallMessage) {
        this.paywallMessage = paywallMessage;
    }

    public LocalDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(LocalDateTime publishedAt) {
        this.publishedAt = publishedAt;
    }
}