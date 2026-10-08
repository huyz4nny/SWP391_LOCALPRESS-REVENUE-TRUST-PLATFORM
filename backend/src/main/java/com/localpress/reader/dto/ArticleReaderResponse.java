package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleReaderResponse {
    private Long id;
    private String title;
    private String slug;
    private String summary;
    private String content;
    private String previewContent;
    private Boolean isPremium;
    private Boolean isLocked;
    private String coverImageUrl;
    private String categoryName;
    private String categorySlug;
    private String publishedAt;
    private String authorName;
    private Long viewCount;
}