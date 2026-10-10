package com.localpress.content.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "articles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Article {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "article_id")
    private Long id;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(name = "slug", nullable = false, length = 280)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_type", nullable = false)
    private AccessType accessType;

    @Column(name = "single_price", precision = 12, scale = 2)
    private BigDecimal singlePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status;

    @Column(name = "published_version")
    private Integer publishedVersion;

    @Column(name = "latest_version", nullable = false)
    private Integer latestVersion;

    @Column(name = "view_count", nullable = false)
    private Long viewCount;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public static Article createDraft(Long categoryId, Long authorId, String slug){
        Article article = new Article();

        article.categoryId = categoryId;
        article.authorId = authorId;
        article.slug = slug;
        article.accessType = AccessType.FREE;
        article.singlePrice = BigDecimal.ZERO;
        article.status = Status.DRAFT;
        article.latestVersion = 0;
        article.viewCount = 0L;

        return article;
    }

    public void advanceDraftVersion(int versionNumber){
        if(status != Status.DRAFT){
            throw new IllegalStateException("Chỉ được cập nhật phiên bản bằng thao tác này khi bài đang là bản nháp");
        }

        if(versionNumber != latestVersion + 1) {
            throw new IllegalStateException("Phiên bản mới phải liền sau phiên bản hiện tại");
        }

        this.latestVersion = versionNumber;
    }

    public enum AccessType {
        FREE, PREMIUM
    }

    public enum Status {
        DRAFT, PENDING, PUBLISHED, REJECTED, ARCHIVED, TAKEN_DOWN
    }

    public void updateDraftMetadata(Long categoryId, String slug) {

        if (status != Status.DRAFT) {
            throw new IllegalStateException(
                    "Chỉ được cập nhật metadata bằng thao tác này khi bài đang là bản nháp"
            );
        }

        if (categoryId == null || categoryId <= 0) {
            throw new IllegalArgumentException(
                    "Mã chuyên mục phải lớn hơn 0"
            );
        }

        if (slug == null
                || slug.length() > 280
                || !slug.matches("^[a-z0-9]+(?:-[a-z0-9]+)*$")) {
            throw new IllegalArgumentException(
                    "Slug không hợp lệ"
            );
        }

        this.categoryId = categoryId;
        this.slug = slug;
    }
}
