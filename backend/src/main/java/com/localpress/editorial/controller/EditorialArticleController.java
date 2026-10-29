package com.localpress.editorial.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.editorial.dto.EditorialArticleDto;
import com.localpress.editorial.dto.SaveEditorialArticleRequest;
import com.localpress.editorial.dto.UpdateArticleStatusRequest;
import com.localpress.editorial.service.ArticleReviewService;
import com.localpress.shared.constant.AppConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * REST Controller phục vụ Màn hình 1 của SV2 (Trọng Phan):
 * Article Review and Publishing (UC025).
 *
 * Base URL: /api/v1/editorial/articles
 */
@RestController
@RequestMapping(AppConstants.API_V1_PREFIX + "/editorial/articles")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('EDITOR', 'AUTHOR', 'STAFF', 'SYSTEM_ADMIN')")
public class EditorialArticleController {

    private final ArticleReviewService articleReviewService;
    private final ObjectMapper objectMapper;

    /**
     * GET /api/v1/editorial/articles
     * Lấy danh sách toàn bộ bài viết trong tòa soạn kèm phiên bản mới nhất và lịch sử phiên bản.
     */
    @GetMapping
    public ResponseEntity<List<EditorialArticleDto>> getAllArticles() {
        return ResponseEntity.ok(articleReviewService.getAllArticles());
    }

    /**
     * GET /api/v1/editorial/articles/{id}
     * Lấy chi tiết 1 bài viết theo ID (bao gồm toàn văn bản thảo và danh sách các version).
     */
    @GetMapping("/{id}")
    public ResponseEntity<EditorialArticleDto> getArticleById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(articleReviewService.getArticleById(id));
    }

    /**
     * POST /api/v1/editorial/articles (JSON)
     * Soạn bài mới từ giao diện Tòa soạn.
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<EditorialArticleDto> createArticle(
            @RequestBody SaveEditorialArticleRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        EditorialArticleDto created = articleReviewService.createArticle(request, null, null, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * POST /api/v1/editorial/articles (Multipart / Form-Data)
     * Soạn bài mới kèm upload ảnh bìa (hỗ trợ cả part 'article' lẫn 'request').
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<EditorialArticleDto> createArticleWithCover(
            @RequestPart(value = "article", required = false) String articleJson,
            @RequestPart(value = "request", required = false) String requestJson,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestPart(value = "info", required = false) String infoJson,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        SaveEditorialArticleRequest request = parseArticleRequest(articleJson != null ? articleJson : requestJson);
        EditorialArticleDto created = articleReviewService.createArticle(request, file, infoJson, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/v1/editorial/articles/{id} (JSON)
     * Cập nhật bản thảo bài viết.
     */
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<EditorialArticleDto> updateArticle(
            @PathVariable("id") Long id,
            @RequestBody SaveEditorialArticleRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        EditorialArticleDto updated = articleReviewService.updateArticle(id, request, null, null, email);
        return ResponseEntity.ok(updated);
    }

    /**
     * PUT /api/v1/editorial/articles/{id} (Multipart / Form-Data)
     * Cập nhật bản thảo kèm file ảnh bìa mới.
     */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<EditorialArticleDto> updateArticleWithCover(
            @PathVariable("id") Long id,
            @RequestPart(value = "request", required = false) String requestJson,
            @RequestPart(value = "article", required = false) String articleJson,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestPart(value = "info", required = false) String infoJson,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        SaveEditorialArticleRequest request = parseArticleRequest(requestJson != null ? requestJson : articleJson);
        EditorialArticleDto updated = articleReviewService.updateArticle(id, request, file, infoJson, email);
        return ResponseEntity.ok(updated);
    }

    /**
     * POST /api/v1/editorial/articles/{id}/status
     * Tổng biên tập / Biên tập viên (SV2) thực hiện:
     * - Duyệt bài (APPROVED)
     * - Yêu cầu sửa / Từ chối (CHANGES_REQUESTED / REJECTED)
     * - Xuất bản lên báo (PUBLISHED)
     * - Hạ bài (UNPUBLISHED / TAKEN_DOWN)
     *
     * Chặn role AUTHOR, chỉ cho phép EDITOR hoặc SYSTEM_ADMIN.
     */
    @PreAuthorize("hasAnyRole('EDITOR', 'SYSTEM_ADMIN')")
    @PostMapping("/{id}/status")
    public ResponseEntity<EditorialArticleDto> updateArticleStatus(
            @PathVariable("id") Long id,
            @RequestBody UpdateArticleStatusRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(articleReviewService.updateArticleStatus(id, request, email));
    }

    private SaveEditorialArticleRequest parseArticleRequest(String json) {
        if (json == null || json.isBlank()) {
            return new SaveEditorialArticleRequest();
        }
        try {
            return objectMapper.readValue(json, SaveEditorialArticleRequest.class);
        } catch (Exception e) {
            return new SaveEditorialArticleRequest();
        }
    }
}
