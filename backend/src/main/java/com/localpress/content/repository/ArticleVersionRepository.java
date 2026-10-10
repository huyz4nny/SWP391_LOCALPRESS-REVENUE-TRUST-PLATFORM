package com.localpress.content.repository;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.Optional;

public interface ArticleVersionRepository
        extends JpaRepository<ArticleVersion, Long> {

    List<ArticleVersion> findByArticleIdOrderByVersionNumberDesc(Long articleId);

    boolean existsByCoverImageUrl(String coverImageUrl);

    Optional<ArticleVersion> findByArticleIdAndVersionNumber(
            Long articleId,
            Integer versionNumber
    );

    @Query("""
            SELECT v
            FROM ArticleVersion v, Article a
            WHERE v.articleId = a.id
              AND a.authorId = :authorId
              AND a.status = :status
              AND v.versionNumber = a.latestVersion
              AND v.coverImageUrl = :imageUrl
            """)
    Optional<ArticleVersion> findOwnedDraftCoverImage(
            @Param("authorId") Long authorId,
            @Param("status") Article.Status status,
            @Param("imageUrl") String imageUrl
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT v
        FROM ArticleVersion v
        WHERE v.articleId = :articleId
          AND v.versionNumber = :versionNumber
        """)
    Optional<ArticleVersion> findVersionForUpdate(
            @Param("articleId") Long articleId,
            @Param("versionNumber") Integer versionNumber
    );
}