package com.localpress.editorial.service;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.editorial.dto.*;
import com.localpress.editorial.entity.EditorialComment;
import com.localpress.editorial.entity.EditorialSubscriptionPlan;
import com.localpress.editorial.repository.EditorialCommentRepository;
import com.localpress.editorial.repository.EditorialSubscriptionPlanRepository;
import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service xử lý nghiệp vụ Màn hình 2 của SV2 (Trọng Phan):
 * Content Policy and Moderation (UC026, UC027, UC028).
 *
 * Chức năng:
 * - UC026: Kiểm duyệt bình luận độc giả (Duyệt APPROVED, từ chối REJECTED, ẩn HIDDEN).
 *   Tuân thủ Quy tắc bất biến số 12: Bình luận sau khi sửa phải kiểm duyệt lại.
 * - UC027: Thiết lập chính sách truy cập bài viết (FREE/PREMIUM) và giá bán lẻ (single_price).
 *   Sử dụng chung thực thể Article của Tùng (CMS), tuân thủ ràng buộc chk_articles_price.
 * - UC028: Quản lý danh mục gói cước hội viên (subscription_plans).
 */
@Service
@RequiredArgsConstructor
public class ContentPolicyModerationService {

    private final EditorialCommentRepository commentRepository;
    private final EditorialSubscriptionPlanRepository planRepository;
    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository versionRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    private Long resolveUserId(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa xác thực danh tính người dùng");
        }
        List<Long> ids = jdbcTemplate.query(
                "SELECT user_id FROM users WHERE email = ? AND status = 'ACTIVE'",
                (rs, r) -> rs.getLong(1),
                email
        );
        if (ids.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản không tồn tại hoặc không có quyền truy cập");
        }
        return ids.get(0);
    }

    // =========================================================================
    // UC026: KIỂM DUYỆT BÌNH LUẬN (COMMENT MODERATION)
    // =========================================================================

    /**
     * [SV2_FLOW_BL_7] [SV2_DB_BL] [DATABASE INTERACTION - LỌC & LẤY DANH SÁCH BÌNH LUẬN (GET COMMENTS)]
     * - Bảng chính: `comments`
     *   + Cột đọc: comment_id, article_id, user_id, parent_id, moderated_by, content, status, created_at, updated_at
     *   + Điều kiện: `SELECT * FROM comments WHERE status = ? ORDER BY created_at DESC`
     * - Bảng liên kết 1: `articles` (cột: article_id, slug, title từ bảng article_versions mới nhất)
     * - Bảng liên kết 2: `users` (cột: user_id, full_name, avatar_url cho độc giả & BTV kiểm duyệt)
     * Lấy danh sách bình luận (hỗ trợ lọc theo trạng thái: ALL, PENDING, APPROVED, REJECTED, HIDDEN).
     */
    @Transactional(readOnly = true)
    public List<EditorialCommentDto> getComments(String statusFilter) {
        List<EditorialComment> comments;
        if (statusFilter == null || statusFilter.isBlank() || "ALL".equalsIgnoreCase(statusFilter.trim())) {
            comments = commentRepository.findAllByOrderByCreatedAtDesc();
        } else {
            try {
                EditorialComment.CommentStatus st = EditorialComment.CommentStatus.valueOf(statusFilter.trim().toUpperCase());
                comments = commentRepository.findByStatusOrderByCreatedAtDesc(st);
            } catch (IllegalArgumentException e) {
                comments = commentRepository.findAllByOrderByCreatedAtDesc();
            }
        }

        return comments.stream()
                .map(this::mapCommentToDto)
                .collect(Collectors.toList());
    }

    /**
     * [SV2_FLOW_BL_8] [SV2_DB_BL] [DATABASE INTERACTION - DUYỆT / TỪ CHỐI / ẨN BÌNH LUẬN (MODERATE COMMENT)]
     * 1. Bảng `comments`:
     *    - Cột cập nhật:
     *      + `status`: Chuyển sang 'APPROVED' (hiển thị công khai), 'REJECTED' (từ chối do vi phạm), hoặc 'HIDDEN' (ẩn khẩn cấp)
     *      + `moderated_by`: Gán user_id của BTV đang kiểm duyệt (để truy vết trách nhiệm kiểm duyệt)
     *      + `updated_at`: CURRENT_TIMESTAMP
     * 2. Bảng `audit_logs`:
     *    - Cột ghi: `user_id` = moderatorUserId, `action` = 'COMMENT_MODERATE_' + targetStatus,
     *               `target_type` = 'comments', `target_id` = comment_id, `old_value`, `new_value`, `created_at` = NOW()
     * Duyệt / Từ chối / Ẩn bình luận độc giả (UC026).
     */
    @Transactional
    public EditorialCommentDto moderateComment(Long commentId, ModerateCommentRequest request, String email) {
        Long moderatorUserId = resolveUserId(email);

        EditorialComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException("Không tìm thấy bình luận với ID: " + commentId, HttpStatus.NOT_FOUND));

        String oldStatus = comment.getStatus().name();
        String targetStatus = request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "";

        switch (targetStatus) {
            case "APPROVED":
                comment.approve(moderatorUserId);
                break;
            case "REJECTED":
                comment.reject(moderatorUserId);
                break;
            case "HIDDEN":
                comment.hide(moderatorUserId);
                break;
            default:
                throw new AppException("Trạng thái kiểm duyệt không hợp lệ: " + targetStatus, HttpStatus.BAD_REQUEST);
        }

        EditorialComment saved = commentRepository.save(comment);

        // Ghi vết vào audit_logs với cột chuẩn (user_id, action, target_type, target_id)
        try {
            jdbcTemplate.update(
                    "INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, new_value, created_at) " +
                            "VALUES (?, ?, 'comments', ?, ?, ?, NOW())",
                    moderatorUserId,
                    "COMMENT_MODERATE_" + targetStatus,
                    saved.getCommentId(),
                    String.format("{\"status\":\"%s\"}", oldStatus),
                    String.format("{\"status\":\"%s\",\"reason\":\"%s\"}", targetStatus, request.getReason() != null ? request.getReason() : "")
            );
        } catch (Exception ignored) {
        }

        return mapCommentToDto(saved);
    }

    private EditorialCommentDto mapCommentToDto(EditorialComment comment) {
        String articleTitle = "Bài viết #" + comment.getArticleId();
        String articleSlug = "bai-viet";
        Optional<Article> artOpt = articleRepository.findById(comment.getArticleId());
        if (artOpt.isPresent()) {
            articleSlug = artOpt.get().getSlug();
            Optional<ArticleVersion> verOpt = versionRepository.findByArticleIdAndVersionNumber(
                    artOpt.get().getId(), artOpt.get().getLatestVersion());
            if (verOpt.isPresent()) {
                articleTitle = verOpt.get().getTitle();
            }
        }

        String userName = "Độc giả";
        String userAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100";
        Optional<User> userOpt = userRepository.findById(comment.getUserId());
        if (userOpt.isPresent()) {
            userName = userOpt.get().getFullName();
        }

        String moderatorName = null;
        if (comment.getModeratedBy() != null) {
            moderatorName = userRepository.findById(comment.getModeratedBy())
                    .map(User::getFullName)
                    .orElse("Biên tập viên");
        }

        return EditorialCommentDto.builder()
                .id(String.valueOf(comment.getCommentId()))
                .articleId(String.valueOf(comment.getArticleId()))
                .articleTitle(articleTitle)
                .articleSlug(articleSlug)
                .userId(String.valueOf(comment.getUserId()))
                .userName(userName)
                .userAvatar(userAvatar)
                .content(comment.getContent())
                .status(comment.getStatus().name())
                .createdAt(comment.getCreatedAt())
                .likeCount(0)
                .reported(comment.getStatus() == EditorialComment.CommentStatus.REJECTED || comment.getStatus() == EditorialComment.CommentStatus.HIDDEN)
                .moderatedBy(comment.getModeratedBy() != null ? String.valueOf(comment.getModeratedBy()) : null)
                .moderatorName(moderatorName)
                .build();
    }

    // =========================================================================
    // UC027: CHÍNH SÁCH BÀI VIẾT (ARTICLE ACCESS POLICY & PRICING)
    // =========================================================================

    /**
     * [SV2_FLOW_CHINH_SACH_5] [SV2_DB_CHINH_SACH] [DATABASE INTERACTION - THIẾT LẬP CHÍNH SÁCH BÀI VIẾT (ARTICLE ACCESS POLICY)]
     * 1. Bảng `articles`:
     *    - Cột cập nhật:
     *      + `access_type`: Chuyển đổi giữa 'FREE' (Miễn phí 100%) và 'PREMIUM' (Thu phí Paywall)
     *      + `single_price`: Nếu FREE thì ép về 0.00; Nếu PREMIUM thì lưu giá bán lẻ (ví dụ 15,000đ)
     *      + `updated_at`: CURRENT_TIMESTAMP
     *    - Ràng buộc toàn vẹn MySQL: CHECK constraint `chk_articles_price`:
     *      ((access_type = 'FREE' AND (single_price IS NULL OR single_price = 0)) OR
     *       (access_type = 'PREMIUM' AND single_price IS NOT NULL AND single_price >= 0))
     * 2. Bảng `audit_logs`:
     *    - Cột ghi: `user_id` = editorUserId, `action` = 'ARTICLE_POLICY_UPDATE',
     *               `target_type` = 'articles', `target_id` = article_id, `new_value`, `created_at` = NOW()
     */
    @Transactional
    public EditorialArticleDto updateArticlePolicy(Long articleId, UpdateArticlePolicyRequest request, String email) {
        Long editorUserId = resolveUserId(email);
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new AppException("Không tìm thấy bài viết với ID: " + articleId, HttpStatus.NOT_FOUND));

        String accessTypeStr = request.getAccessType() != null ? request.getAccessType().trim().toUpperCase() : "FREE";
        Article.AccessType accessType;
        try {
            accessType = Article.AccessType.valueOf(accessTypeStr);
        } catch (IllegalArgumentException e) {
            throw new AppException("Loại truy cập không hợp lệ: " + accessTypeStr, HttpStatus.BAD_REQUEST);
        }

        BigDecimal price = request.getSinglePrice();
        if (accessType == Article.AccessType.FREE) {
            price = BigDecimal.ZERO;
        } else {
            if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
                price = new BigDecimal("15000.00"); // Giá mặc định cho bài Premium
            }
        }

        article.updateAccessPolicy(accessType, price);
        Article saved = articleRepository.save(article);

        // Ghi audit_logs với user_id
        try {
            jdbcTemplate.update(
                    "INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value, created_at) " +
                            "VALUES (?, 'ARTICLE_POLICY_UPDATE', 'articles', ?, ?, NOW())",
                    editorUserId,
                    saved.getId(),
                    String.format("{\"accessType\":\"%s\",\"singlePrice\":%s}", accessType.name(), price.toPlainString())
            );
        } catch (Exception ignored) {
        }

        // Tái sử dụng mapper từ ArticleReviewService hoặc tạo DTO tóm tắt
        return EditorialArticleDto.builder()
                .id(String.valueOf(saved.getId()))
                .slug(saved.getSlug())
                .isPremium(saved.getAccessType() == Article.AccessType.PREMIUM)
                .price(saved.getSinglePrice())
                .status(saved.getStatus().name())
                .build();
    }

    // =========================================================================
    // UC028: QUẢN LÝ GÓI CƯỚC HỘI VIÊN (SUBSCRIPTION PLANS MANAGEMENT)
    // =========================================================================

    /**
     * Lấy toàn bộ danh sách gói cước hội viên trong CSDL.
     */
    @Transactional(readOnly = true)
    public List<SubscriptionPlanDto> getAllPlans() {
        return planRepository.findAllByOrderByPriceAsc().stream()
                .map(this::mapPlanToDto)
                .collect(Collectors.toList());
    }

    /**
     * [SV2_FLOW_GOI_CUOC_5] [BACKEND SERVICE] Tạo mới một gói cước hội viên (UC028).
     */
    @Transactional
    public SubscriptionPlanDto createPlan(SaveSubscriptionPlanRequest request, String email) {
        Long editorUserId = email != null ? resolveUserId(email) : null;

        if (request.getName() == null || request.getName().trim().isBlank()) {
            throw new AppException("Tên gói cước không được để trống", HttpStatus.BAD_REQUEST);
        }
        String name = request.getName().trim();
        if (planRepository.existsByName(name)) {
            throw new AppException("Tên gói cước '" + name + "' đã tồn tại", HttpStatus.CONFLICT);
        }

        BigDecimal price = request.getPrice() != null ? request.getPrice() : BigDecimal.ZERO;
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new AppException("Giá gói cước không được âm", HttpStatus.BAD_REQUEST);
        }

        int duration = request.getDurationDays() != null ? request.getDurationDays() : 30;
        if (duration <= 0) {
            throw new AppException("Thời hạn gói cước phải lớn hơn 0 ngày", HttpStatus.BAD_REQUEST);
        }

        EditorialSubscriptionPlan.PlanStatus status = EditorialSubscriptionPlan.PlanStatus.ACTIVE;
        if (request.getStatus() != null) {
            try {
                status = EditorialSubscriptionPlan.PlanStatus.valueOf(request.getStatus().trim().toUpperCase());
            } catch (Exception ignored) {
            }
        }

        EditorialSubscriptionPlan plan = EditorialSubscriptionPlan.builder()
                .name(name)
                .price(price)
                .durationDays(duration)
                .hasAdFree(Boolean.TRUE.equals(request.getHasAdFree()))
                .hasAudio(Boolean.TRUE.equals(request.getHasAudio()))
                .status(status)
                .build();

        EditorialSubscriptionPlan saved = planRepository.save(plan);

        if (editorUserId != null) {
            try {
                jdbcTemplate.update(
                        "INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value, created_at) " +
                                "VALUES (?, 'PLAN_CREATE', 'subscription_plans', ?, ?, NOW())",
                        editorUserId,
                        saved.getPlanId(),
                        String.format("{\"name\":\"%s\"}", saved.getName())
                );
            } catch (Exception ignored) {
            }
        }

        return mapPlanToDto(saved);
    }

    /**
     * Cập nhật thông tin gói cước hội viên (UC028).
     */
    @Transactional
    public SubscriptionPlanDto updatePlan(Long planId, SaveSubscriptionPlanRequest request, String email) {
        Long editorUserId = email != null ? resolveUserId(email) : null;

        EditorialSubscriptionPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Không tìm thấy gói cước với ID: " + planId, HttpStatus.NOT_FOUND));

        if (request.getName() != null && !request.getName().trim().isBlank()) {
            String newName = request.getName().trim();
            if (planRepository.existsByNameAndPlanIdNot(newName, planId)) {
                throw new AppException("Tên gói cước '" + newName + "' đã được dùng bởi gói khác", HttpStatus.CONFLICT);
            }
        }

        EditorialSubscriptionPlan.PlanStatus st = null;
        if (request.getStatus() != null) {
            try {
                st = EditorialSubscriptionPlan.PlanStatus.valueOf(request.getStatus().trim().toUpperCase());
            } catch (Exception ignored) {
            }
        }

        plan.updatePlan(
                request.getName(),
                request.getPrice(),
                request.getDurationDays(),
                request.getHasAdFree(),
                request.getHasAudio(),
                st
        );

        EditorialSubscriptionPlan saved = planRepository.save(plan);

        if (editorUserId != null) {
            try {
                jdbcTemplate.update(
                        "INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value, created_at) " +
                                "VALUES (?, 'PLAN_UPDATE', 'subscription_plans', ?, ?, NOW())",
                        editorUserId,
                        saved.getPlanId(),
                        String.format("{\"name\":\"%s\"}", saved.getName())
                );
            } catch (Exception ignored) {
            }
        }

        return mapPlanToDto(saved);
    }

    /**
     * [SV2_FLOW_GOI_CUOC_5] [SV2_DB_GOI_CUOC] [DATABASE INTERACTION - BẬT/TẮT TRẠNG THÁI GÓI CƯỚC HỘI VIÊN (SUBSCRIPTION PLANS)]
     * 1. Bảng `subscription_plans`:
     *    - Cột cập nhật: `status` = 'ACTIVE' (Mở bán) <-> 'INACTIVE' (Tạm ngưng)
     *    - Cột đọc kiểm tra: `plan_id`, `name`, `price`, `duration_days`, `has_ad_free`, `has_audio`, `status`
     * 2. Bảng `audit_logs`:
     *    - Cột ghi: `user_id` = editorUserId, `action` = 'PLAN_TOGGLE', `target_type` = 'subscription_plans',
     *               `target_id` = planId, `new_value`, `created_at` = NOW()
     */
    @Transactional
    public SubscriptionPlanDto togglePlanStatus(Long planId, String email) {
        Long editorUserId = email != null ? resolveUserId(email) : null;

        EditorialSubscriptionPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Không tìm thấy gói cước với ID: " + planId, HttpStatus.NOT_FOUND));

        if (plan.getStatus() == EditorialSubscriptionPlan.PlanStatus.ACTIVE) {
            plan.setStatus(EditorialSubscriptionPlan.PlanStatus.INACTIVE);
        } else {
            plan.setStatus(EditorialSubscriptionPlan.PlanStatus.ACTIVE);
        }

        EditorialSubscriptionPlan saved = planRepository.save(plan);

        if (editorUserId != null) {
            try {
                jdbcTemplate.update(
                        "INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value, created_at) " +
                                "VALUES (?, 'PLAN_TOGGLE', 'subscription_plans', ?, ?, NOW())",
                        editorUserId,
                        saved.getPlanId(),
                        String.format("{\"status\":\"%s\"}", saved.getStatus().name())
                );
            } catch (Exception ignored) {
            }
        }

        return mapPlanToDto(saved);
    }

    private SubscriptionPlanDto mapPlanToDto(EditorialSubscriptionPlan plan) {
        List<String> features = new ArrayList<>();
        features.add("Đọc không giới hạn toàn bộ bài viết chuyên sâu");
        if (plan.isHasAdFree()) {
            features.add("Trải nghiệm sạch 100% không quảng cáo");
        }
        if (plan.isHasAudio()) {
            features.add("Nghe audio báo nói AI chất lượng cao");
        }
        features.add("Thời hạn " + plan.getDurationDays() + " ngày");

        String code = "PLAN_" + plan.getPlanId();

        return SubscriptionPlanDto.builder()
                .id(String.valueOf(plan.getPlanId()))
                .name(plan.getName())
                .code(code)
                .price(plan.getPrice())
                .durationDays(plan.getDurationDays())
                .description("Gói hội viên " + plan.getName() + " truy cập toàn quyền LocalPress")
                .features(features)
                .hasAdFree(plan.isHasAdFree())
                .hasAudio(plan.isHasAudio())
                .isActive(plan.getStatus() == EditorialSubscriptionPlan.PlanStatus.ACTIVE)
                .status(plan.getStatus().name())
                .build();
    }
}
