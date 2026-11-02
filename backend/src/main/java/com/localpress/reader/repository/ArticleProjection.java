// package repository của reader làm việc với database
package com.localpress.reader.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// interface hứng kết quả native sql join articles article_versions categories và users
// spring tự map từng cột alias trong câu select sang các hàm get bên dưới
// luồng đi là ReaderArticleRepository trả projection -> ReaderArticleServiceImpl đọc rồi đổi sang dto
public interface ArticleProjection {
    Long getId();
    String getTitle();
    String getSlug();
    String getSummary();
    // toàn văn bài chỉ có ở câu truy vấn chi tiết còn câu danh sách thì không select cột này
    String getContent();
    String getCoverImageUrl();
    String getCategoryName();
    String getCategorySlug();
    // FREE hoặc PREMIUM
    String getAccessType();
    LocalDateTime getPublishedAt();
    String getAuthorName();
    Long getViewCount();
    // giá mua lẻ của bài
    BigDecimal getSinglePrice();
}
