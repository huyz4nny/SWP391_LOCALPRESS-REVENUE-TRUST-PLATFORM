package com.localpress.editorial.controller;

import com.localpress.editorial.dto.EditorialArticleDto;
import com.localpress.editorial.dto.UpdateArticleStatusRequest;
import com.localpress.editorial.service.ArticleReviewService;
import com.localpress.shared.constant.AppConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
public class EditorialArticleController {

    private final ArticleReviewService articleReviewService;

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
     * POST /api/v1/editorial/articles/{id}/status
     * Tổng biên tập / Biên tập viên (SV2) thực hiện:
     * - Duyệt bài (APPROVED)
     * - Yêu cầu sửa / Từ chối (CHANGES_REQUESTED / REJECTED)
     * - Xuất bản lên báo (PUBLISHED)
     * - Hạ bài (UNPUBLISHED / TAKEN_DOWN)
     */
    @PostMapping("/{id}/status")
    public ResponseEntity<EditorialArticleDto> updateArticleStatus(
            @PathVariable("id") Long id,
            @RequestBody UpdateArticleStatusRequest request
    ) {
        return ResponseEntity.ok(articleReviewService.updateArticleStatus(id, request));
    }
}
