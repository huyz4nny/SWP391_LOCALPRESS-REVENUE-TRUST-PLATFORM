package com.localpress.reader.controller;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.service.ReaderArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reader/articles")
@RequiredArgsConstructor
public class ReaderArticleController {

    private final ReaderArticleService readerArticleService;

    @GetMapping
    public ResponseEntity<Page<ArticleSummaryResponse>> getArticles(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String access,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(readerArticleService.getArticles(category, search, access, pageable));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ArticleReaderResponse> getArticleBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(readerArticleService.getArticleBySlug(slug));
    }
}