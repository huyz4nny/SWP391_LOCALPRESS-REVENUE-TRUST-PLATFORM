package com.localpress.content.dto;

import java.time.LocalDateTime;

public record ArticleVersionSummaryResponse(Integer versionNumber,
                                            String title,
                                            String reviewStatus,
                                            Long editedBy,
                                            LocalDateTime createdAt,
                                            boolean latest,
                                            boolean published) {
}
