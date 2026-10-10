package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReaderArticleService {
    Page<ArticleSummaryResponse> getArticles(String category, String search, String access, Pageable pageable);

    ArticleReaderResponse getArticleBySlug(String slug);
}