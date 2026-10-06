package com.localpress.reader.controller;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.service.ReaderArticleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/articles") // Đã sửa endpoint mở công khai cho Frontend & SecurityConfig
public class ReaderArticleController {

    private final ReaderArticleService readerArticleService;

    public ReaderArticleController(ReaderArticleService readerArticleService) {
        this.readerArticleService = readerArticleService;
    }

    @GetMapping
    public ResponseEntity<List<ArticleSummaryResponse>> getAllArticles() {
        return ResponseEntity.ok(readerArticleService.getPublishedArticles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArticleReaderResponse> getArticleDetail(@PathVariable Long id) {
        return ResponseEntity.ok(readerArticleService.getArticleById(id));
    }
}