package com.localpress.content.repository;

import com.localpress.content.entity.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ArticleRepository extends JpaRepository<Article, Long> {
    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Optional<Article> findByIdAndAuthorId(Long id, Long authorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT a
           FROM Article a
           WHERE a.id = :articleId
           AND a.authorId = :authorId
           """)
    Optional<Article> findOwnedArticleForUpdate(
            @Param("articleId") Long articleId,
            @Param("authorId") Long authorId
    );
}
