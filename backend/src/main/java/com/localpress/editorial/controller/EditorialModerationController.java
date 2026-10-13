package com.localpress.editorial.controller;

import com.localpress.editorial.dto.*;
import com.localpress.editorial.service.ContentPolicyModerationService;
import com.localpress.shared.constant.AppConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller cho Màn hình 2 của SV2 (Trọng Phan):
 * Content Policy and Moderation (UC026, UC027, UC028).
 *
 * Base URLs:
 * - /api/v1/editorial/comments
 * - /api/v1/editorial/articles/{id}/policy
 * - /api/v1/editorial/subscription-plans
 */
@RestController
@RequestMapping(AppConstants.API_V1_PREFIX + "/editorial")
@RequiredArgsConstructor
public class EditorialModerationController {

    private final ContentPolicyModerationService moderationService;

    // =========================================================================
    // UC026: KIỂM DUYỆT BÌNH LUẬN (COMMENT MODERATION)
    // =========================================================================

    /**
     * GET /api/v1/editorial/comments?status=PENDING
     * Lấy danh sách bình luận (lọc theo trạng thái).
     */
    @GetMapping("/comments")
    public ResponseEntity<List<EditorialCommentDto>> getComments(
            @RequestParam(value = "status", required = false, defaultValue = "ALL") String status
    ) {
        return ResponseEntity.ok(moderationService.getComments(status));
    }

    /**
     * POST /api/v1/editorial/comments/{id}/moderate
     * Duyệt / Từ chối / Ẩn bình luận độc giả.
     */
    @PostMapping("/comments/{id}/moderate")
    public ResponseEntity<EditorialCommentDto> moderateComment(
            @PathVariable("id") Long id,
            @RequestBody ModerateCommentRequest request
    ) {
        return ResponseEntity.ok(moderationService.moderateComment(id, request));
    }

    // =========================================================================
    // UC027: CHÍNH SÁCH BÀI VIẾT (ARTICLE ACCESS POLICY & PRICING)
    // =========================================================================

    /**
     * PUT /api/v1/editorial/articles/{id}/policy
     * Thiết lập chế độ Miễn phí (FREE) hoặc Trả phí (PREMIUM) và giá bán lẻ từng bài.
     */
    @PutMapping("/articles/{id}/policy")
    public ResponseEntity<EditorialArticleDto> updateArticlePolicy(
            @PathVariable("id") Long id,
            @RequestBody UpdateArticlePolicyRequest request
    ) {
        return ResponseEntity.ok(moderationService.updateArticlePolicy(id, request));
    }

    // =========================================================================
    // UC028: QUẢN LÝ GÓI CƯỚC HỘI VIÊN (SUBSCRIPTION PLANS MANAGEMENT)
    // =========================================================================

    /**
     * GET /api/v1/editorial/subscription-plans
     * Lấy toàn bộ danh sách gói cước hội viên.
     */
    @GetMapping("/subscription-plans")
    public ResponseEntity<List<SubscriptionPlanDto>> getAllPlans() {
        return ResponseEntity.ok(moderationService.getAllPlans());
    }

    /**
     * POST /api/v1/editorial/subscription-plans
     * Tạo mới một gói cước hội viên.
     */
    @PostMapping("/subscription-plans")
    public ResponseEntity<SubscriptionPlanDto> createPlan(@RequestBody SaveSubscriptionPlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(moderationService.createPlan(request));
    }

    /**
     * PUT /api/v1/editorial/subscription-plans/{id}
     * Cập nhật thông tin gói cước.
     */
    @PutMapping("/subscription-plans/{id}")
    public ResponseEntity<SubscriptionPlanDto> updatePlan(
            @PathVariable("id") Long id,
            @RequestBody SaveSubscriptionPlanRequest request
    ) {
        return ResponseEntity.ok(moderationService.updatePlan(id, request));
    }

    /**
     * POST /api/v1/editorial/subscription-plans/{id}/toggle-status
     * Bật/Tắt trạng thái hoạt động của gói cước.
     */
    @PostMapping("/subscription-plans/{id}/toggle-status")
    public ResponseEntity<SubscriptionPlanDto> togglePlanStatus(@PathVariable("id") Long id) {
        return ResponseEntity.ok(moderationService.togglePlanStatus(id));
    }
}
