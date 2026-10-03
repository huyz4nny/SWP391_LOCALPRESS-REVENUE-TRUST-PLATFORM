package com.localpress.content.repository;

import com.localpress.content.entity.ArticleVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ArticleVersionRepository extends JpaRepository<ArticleVersion, Long>{
    Optional<ArticleVersion> findByArticleIdAndVersionNumber(Long articleId, Integer versionNumber);
}
