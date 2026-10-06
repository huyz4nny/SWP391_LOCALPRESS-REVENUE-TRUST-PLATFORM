package com.localpress.reader.repository;

import java.time.LocalDateTime;

public interface ArticleProjection {
    Long getId();
    String getTitle();
    String getSummary();
    String getContent();
    String getAccessType();
    String getCategoryName();
    LocalDateTime getPublishedAt();
}