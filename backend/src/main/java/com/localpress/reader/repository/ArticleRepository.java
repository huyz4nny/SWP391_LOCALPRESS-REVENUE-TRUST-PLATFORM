package com.localpress.reader.repository;

import com.localpress.reader.domain.ArticleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ArticleRepository extends JpaRepository<ArticleEntity, Long> {

    @Query(value = "SELECT a.article_id AS id, v.title AS title, v.summary AS summary, " +
            "v.content AS content, a.access_type AS accessType, " +
            "c.name AS categoryName, a.published_at AS publishedAt " +
            "FROM articles a " +
            "LEFT JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number " +
            "LEFT JOIN categories c ON a.category_id = c.category_id " +
            "WHERE a.status = :status", nativeQuery = true)
    List<ArticleProjection> findAllPublishedArticles(@Param("status") String status);

    @Query(value = "SELECT a.article_id AS id, v.title AS title, v.summary AS summary, " +
            "v.content AS content, a.access_type AS accessType, " +
            "c.name AS categoryName, a.published_at AS publishedAt " +
            "FROM articles a " +
            "LEFT JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number " +
            "LEFT JOIN categories c ON a.category_id = c.category_id " +
            "WHERE a.article_id = :id AND a.status = 'PUBLISHED'", nativeQuery = true)
    Optional<ArticleProjection> findPublishedArticleById(@Param("id") Long id);

    @Query(value = "SELECT a.article_id AS id, v.title AS title, v.summary AS summary, " +
            "v.content AS content, a.access_type AS accessType, " +
            "c.name AS categoryName, a.published_at AS publishedAt " +
            "FROM articles a " +
            "LEFT JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number " +
            "LEFT JOIN categories c ON a.category_id = c.category_id " +
            "WHERE c.slug = :category AND a.status = 'PUBLISHED'", nativeQuery = true)
    List<ArticleProjection> findFeedArticlesByCategory(@Param("category") String category);
}