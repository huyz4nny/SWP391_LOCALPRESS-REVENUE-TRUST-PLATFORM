package com.localpress.reader.dto;

public class ArticleSummaryResponse {
    private Long id;
    private String title;
    private String summary;
    private String accessType;
    private String categoryName;
    private String publishedAt;

    public ArticleSummaryResponse() {}

    // Constructor 6 tham số khớp với ReaderArticleServiceImpl
    public ArticleSummaryResponse(Long id, String title, String summary, String accessType, String categoryName, String publishedAt) {
        this.id = id;
        this.title = title;
        this.summary = summary;
        this.accessType = accessType;
        this.categoryName = categoryName;
        this.publishedAt = publishedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getAccessType() { return accessType; }
    public void setAccessType(String accessType) { this.accessType = accessType; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getPublishedAt() { return publishedAt; }
    public void setPublishedAt(String publishedAt) { this.publishedAt = publishedAt; }
}