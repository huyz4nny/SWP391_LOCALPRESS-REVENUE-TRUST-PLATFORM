package com.localpress.reader.repository;

import com.localpress.reader.domain.ArticleEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository("readerArticleRepository")
public interface ReaderArticleRepository extends JpaRepository<ArticleEntity, Long> {

    @Query(value = """
        SELECT a.article_id AS id, v.title AS title, a.slug AS slug, v.summary AS summary,
               v.cover_image_url AS coverImageUrl, c.name AS categoryName, c.slug AS categorySlug,
               a.access_type AS accessType, a.published_at AS publishedAt, u.full_name AS authorName
        FROM articles a
        JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number
        LEFT JOIN categories c ON a.category_id = c.category_id
        LEFT JOIN users u ON a.author_id = u.user_id
        WHERE a.status = 'PUBLISHED'
          AND (:category IS NULL OR LOWER(c.slug) = LOWER(:category) OR LOWER(c.name) = LOWER(:category))
          AND (:search IS NULL OR LOWER(v.title) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(v.summary) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:access IS NULL OR a.access_type = :access)
        ORDER BY a.published_at DESC
        """,
            countQuery = """
        SELECT COUNT(a.article_id) FROM articles a
        JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number
        LEFT JOIN categories c ON a.category_id = c.category_id
        WHERE a.status = 'PUBLISHED'
          AND (:category IS NULL OR LOWER(c.slug) = LOWER(:category) OR LOWER(c.name) = LOWER(:category))
          AND (:search IS NULL OR LOWER(v.title) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(v.summary) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:access IS NULL OR a.access_type = :access)
        """,
            nativeQuery = true)
    Page<ArticleProjection> findAllPublishedArticles(@Param("category") String category,
                                                     @Param("search") String search,
                                                     @Param("access") String access,
                                                     Pageable pageable);

    @Query(value = """
        SELECT a.article_id AS id, v.title AS title, a.slug AS slug, v.summary AS summary,
               v.content AS content, v.cover_image_url AS coverImageUrl,
               c.name AS categoryName, c.slug AS categorySlug, a.access_type AS accessType,
               a.published_at AS publishedAt, u.full_name AS authorName, a.view_count AS viewCount
        FROM articles a
        JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number
        LEFT JOIN categories c ON a.category_id = c.category_id
        LEFT JOIN users u ON a.author_id = u.user_id
        WHERE a.slug = :slug AND a.status = 'PUBLISHED'
        """, nativeQuery = true)
    Optional<ArticleProjection> findPublishedBySlug(@Param("slug") String slug);

    @Modifying
    @Query(value = "UPDATE articles SET view_count = COALESCE(view_count, 0) + 1 WHERE slug = :slug AND status = 'PUBLISHED'",
            nativeQuery = true)
    int incrementViewCount(@Param("slug") String slug);
}