package com.localpress.reader.controller;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.service.ReaderArticleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reader/articles")
public class ReaderArticleController {

    private final ReaderArticleService readerArticleService;

    public ReaderArticleController(ReaderArticleService readerArticleService) {
        this.readerArticleService = readerArticleService;
    }

    // UC029: Bảng tin bài viết & UC033: Lọc theo danh mục
    // GET /api/v1/reader/articles hoặc GET /api/v1/reader/articles?category=Kinh tế
    @GetMapping
    public ResponseEntity<List<ArticleSummaryResponse>> getFeedArticles(
            @RequestParam(value = "category", required = false) String category) {
        List<ArticleSummaryResponse> articles = readerArticleService.getFeedArticles(category);
        return ResponseEntity.ok(articles);
    }

    // UC030: Tìm kiếm bài viết theo từ khóa
    // GET /api/v1/reader/articles/search?keyword=Kinh tế
    @GetMapping("/search")
    public ResponseEntity<List<ArticleSummaryResponse>> searchArticles(
            @RequestParam("keyword") String keyword) {
        List<ArticleSummaryResponse> articles = readerArticleService.searchArticles(keyword);
        return ResponseEntity.ok(articles);
    }

    // UC031 (FREE) & UC032 (PREMIUM / Paywall Engine)
    // GET /api/v1/reader/articles/{id}?userId=100
    @GetMapping("/{id}")
    public ResponseEntity<ArticleReaderResponse> getArticleDetail(
            @PathVariable("id") Long id,
            @RequestParam(value = "userId", required = false) Long userId) {
        ArticleReaderResponse response = readerArticleService.getArticleDetail(id, userId);
        return ResponseEntity.ok(response);
    }
}