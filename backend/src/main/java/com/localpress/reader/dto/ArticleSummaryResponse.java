// package dto của reader chứa các object dùng để trả dữ liệu ra api
package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// dto tóm tắt bài viết cho trang chủ và tìm kiếm phục vụ UC029 và UC030 ở màn hình II.3.1
// không có trường content toàn văn để danh sách tải nhanh
// luồng đi là ReaderArticleServiceImpl map từ projection -> controller trả trong Page json -> frontend HomePage và SearchPage hiển thị thẻ bài
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleSummaryResponse {
    private Long id;
    private String title;
    private String slug;
    private String summary;
    private String coverImageUrl;
    private String categoryName;
    private String categorySlug;
    // dùng để frontend hiện nhãn premium trên thẻ bài
    private Boolean isPremium;
    private String publishedAt;
    private String authorName;
    private Long viewCount;
    private BigDecimal price;
}
