// package dto của reader chứa các object dùng để trả dữ liệu ra api
package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// dto chi tiết bài đọc trả về cho độc giả phục vụ UC031 và UC032 ở màn hình II.3.2
// luồng đi là ReaderArticleServiceImpl tạo object này -> controller trả json -> frontend ArticleDetailPage hiển thị
// khi isLocked bằng true thì content bị xóa thành null và chỉ còn previewContent
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleReaderResponse {
    private Long id;
    private String title;
    private String slug;
    private String summary;
    // toàn văn bài viết và sẽ là null nếu bị paywall khóa
    private String content;
    // bản 30 phần trăm của bài premium hoặc toàn văn của bài free
    private String previewContent;
    // true nếu là bài trả phí
    private Boolean isPremium;
    // true nếu bài đang bị khóa và cần thanh toán
    private Boolean isLocked;
    private String coverImageUrl;
    private String categoryName;
    private String categorySlug;
    private String publishedAt;
    private String authorName;
    private Long viewCount;
    // giá mua lẻ từng bài tính bằng vnd
    private BigDecimal price;
}
