package com.localpress.editorial.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng articles (Thực thể bài viết gốc).
 * Phục vụ màn hình Article Review & Publishing (UC025) và Content Policy (UC027) của SV2.
 */
@Entity
@Table(name = "articles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditorialArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "article_id")
    private Long articleId;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(name = "slug", nullable = false, length = 280, unique = true)
    private String slug;

    /**
     * Loại quyền truy cập: FREE hoặc PREMIUM (Quy tắc 1, 2, 3)
     */
    @Column(name = "access_type", nullable = false, columnDefinition = "ENUM('FREE', 'PREMIUM')")
    private String accessType;

    /**
     * Giá mua lẻ bài viết (chỉ áp dụng khi access_type = 'PREMIUM', nếu 'FREE' thì = 0 hoặc null)
     */
    @Column(name = "single_price", precision = 12, scale = 2)
    private BigDecimal singlePrice;

    /**
     * Trạng thái bài viết: DRAFT, PENDING, PUBLISHED, REJECTED, ARCHIVED, TAKEN_DOWN
     */
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'TAKEN_DOWN')")
    private String status;

    /**
     * Số phiên bản đang được xuất bản công khai trên báo (Quy tắc 8)
     */
    @Column(name = "published_version")
    private Integer publishedVersion;

    /**
     * Số phiên bản mới nhất mà phóng viên đã tạo/sửa
     */
    @Column(name = "latest_version", nullable = false)
    private Integer latestVersion;

    @Column(name = "view_count", nullable = false)
    private Long viewCount;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.accessType == null) this.accessType = "FREE";
        if (this.status == null) this.status = "DRAFT";
        if (this.latestVersion == null) this.latestVersion = 1;
        if (this.viewCount == null) this.viewCount = 0L;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
