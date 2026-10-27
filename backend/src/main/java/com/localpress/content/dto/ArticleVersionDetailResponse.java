package com.localpress.content.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record ArticleVersionDetailResponse(Long articleId,
                                           Integer versionNumber,
                                           String title,
                                           String sapo,
                                           String content,
                                           String coverImageUrl,
                                           Map<String, Object> metadata,
                                           String reviewStatus,
                                           String reviewFeedback,
                                           Long editedBy,
                                           LocalDateTime createdAt,
                                           boolean latest,
                                           boolean published) {
}
