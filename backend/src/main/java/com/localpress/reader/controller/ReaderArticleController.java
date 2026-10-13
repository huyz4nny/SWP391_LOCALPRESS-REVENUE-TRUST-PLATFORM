package com.localpress.reader.controller;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.service.ReaderArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API đọc báo công khai (SV3). Dùng chung prefix /api/v1/articles theo yêu cầu Leader:
 * SecurityConfig đã permitAll GET /api/v1/articles/** nên Guest đọc Free 100% (Rule 1).
 */
@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class ReaderArticleController {

    private static final int MAX_PAGE_SIZE = 50;

    private final ReaderArticleService readerArticleService;

    /**
     * Không nhận Pageable/sort từ client: truy vấn là native query đã cố định ORDER BY published_at DESC.
     * isPremium là tham số tương thích với frontend, quy đổi thành access=FREE/PREMIUM.
     */
    @GetMapping
    public ResponseEntity<Page<ArticleSummaryResponse>> getArticles(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String access,
            @RequestParam(required = false) Boolean isPremium,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String resolvedAccess = access;
        if ((resolvedAccess == null || resolvedAccess.isBlank()) && isPremium != null) {
            resolvedAccess = isPremium ? "PREMIUM" : "FREE";
        }
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        return ResponseEntity.ok(readerArticleService.getArticles(category, search, resolvedAccess, pageable));
    }

    /**
     * Regex yêu cầu slug có ít nhất 1 ký tự không phải số, để không tranh route với
     * GET /api/v1/articles/{id} (bản nháp CMS của SV5, id thuần số).
     */
    @GetMapping("/{slug:.*\\D.*}")
    public ResponseEntity<ArticleReaderResponse> getArticleBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(readerArticleService.getArticleBySlug(slug));
    }
}
