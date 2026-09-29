package com.localpress.content.repository;

import com.localpress.content.entity.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ArticleRepository extends JpaRepository<Article, Long> {
    boolean existsBySlug(String slug);
    Optional<Article> findByIdAndAuthorId(Long id, Long authorId);
}
