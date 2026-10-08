package com.localpress.reader.repository;

import java.time.LocalDateTime;

public interface ArticleProjection {
    Long getId();
    String getTitle();
    String getSlug();
    String getSummary();
    String getContent();
    String getCoverImageUrl();
    String getCategoryName();
    String getCategorySlug();
    String getAccessType();
    LocalDateTime getPublishedAt();
    String getAuthorName();
    Long getViewCount();
}