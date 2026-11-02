// package domain của reader chứa entity ánh xạ bảng trong database
package com.localpress.reader.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// entity ánh xạ bảng articles chỉ khai báo vài cột reader cần là id slug loại truy cập lượt xem và trạng thái
// được ReaderArticleRepository dùng làm kiểu cho JpaRepository còn dữ liệu đọc bài thật thì lấy bằng native sql
@Entity
@Table(name = "articles")
@Getter
@Setter
@NoArgsConstructor
public class ArticleEntity {

    // khóa chính tự tăng của bảng articles
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "article_id")
    private Long id;

    // slug dùng làm đường dẫn bài viết
    private String slug;

    // FREE hoặc PREMIUM quyết định bài có bị paywall hay không
    @Column(name = "access_type")
    private String accessType;

    // số lượt xem
    @Column(name = "view_count")
    private Long viewCount;

    // trạng thái bài và reader chỉ lấy bài PUBLISHED
    private String status;
}
