package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;

import java.util.List;

public interface ReaderArticleService {
    List<ArticleSummaryResponse> getPublishedArticles();
    List<ArticleSummaryResponse> getFeedArticles(String category);
    ArticleReaderResponse getArticleById(Long id);
}