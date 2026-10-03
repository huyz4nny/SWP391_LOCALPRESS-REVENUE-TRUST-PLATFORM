package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;

import java.util.List;

public interface ReaderArticleService {
    // UC029: Bảng tin bài viết & UC033: Lọc theo danh mục
    List<ArticleSummaryResponse> getFeedArticles(String category);

    // UC030: Tìm kiếm bài viết theo từ khóa
    List<ArticleSummaryResponse> searchArticles(String keyword);

    // UC031 (FREE) & UC032 (PREMIUM / Paywall Engine)
    ArticleReaderResponse getArticleDetail(Long articleId, Long userId);
}