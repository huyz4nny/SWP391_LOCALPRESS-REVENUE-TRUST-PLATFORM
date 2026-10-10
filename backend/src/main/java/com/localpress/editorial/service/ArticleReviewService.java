package com.localpress.editorial.service;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.entity.Category;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.content.repository.CategoryRepository;
import com.localpress.editorial.dto.EditorialArticleDto;
import com.localpress.editorial.dto.UpdateArticleStatusRequest;
import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service xử lý nghiệp vụ Màn hình 1 của SV2 (Trọng Phan):
 * Article Review and Publishing (UC025).
 *
 * Tích hợp theo đúng phản hồi Code Review của Leader Huy:
 * - Sử dụng chung thực thể Article và ArticleVersion từ package com.localpress.content.entity (do Tùng SV5 tạo).
 * - Sử dụng ArticleRepository và ArticleVersionRepository từ com.localpress.content.repository.
 * - Tuân thủ Quy tắc 8 (Phiên bản hóa bài viết) và Invariant Rules.
 */
@Service
@RequiredArgsConstructor
public class ArticleReviewService {

    /**
     * ID mặc định của Biên tập viên SV2 trong seed_data.sql (Nguyễn Văn Biên Tập - user_id = 3)
     */
    private static final Long DEFAULT_EDITOR_USER_ID = 3L;

    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository versionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Lấy danh sách toàn bộ bài viết trong tòa soạn kèm phiên bản mới nhất và lịch sử phiên bản.
     */
    @Transactional(readOnly = true)
    public List<EditorialArticleDto> getAllArticles() {
        List<Article> articles = articleRepository.findAllByOrderByUpdatedAtDesc();
        return articles.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết 1 bài viết theo ID để xem toàn văn bản thảo và lịch sử phiên bản.
     */
    @Transactional(readOnly = true)
    public EditorialArticleDto getArticleById(Long articleId) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new AppException("Không tìm thấy bài viết với ID: " + articleId, HttpStatus.NOT_FOUND));
        return mapToDto(article);
    }

    /**
     * Duyệt bài / Yêu cầu sửa / Xuất bản / Gỡ bài (UC025).
     *
     * Input:
     * - articleId: ID bài viết cần chuyển trạng thái
     * - request: chứa status đích (APPROVED, CHANGES_REQUESTED/REJECTED, PUBLISHED, UNPUBLISHED/TAKEN_DOWN)
     *            và reviewNotes (nhận xét của biên tập viên SV2).
     */
    @Transactional
    public EditorialArticleDto updateArticleStatus(Long articleId, UpdateArticleStatusRequest request) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new AppException("Không tìm thấy bài viết với ID: " + articleId, HttpStatus.NOT_FOUND));

        String oldStatus = article.getStatus() != null ? article.getStatus().name() : "DRAFT";
        String targetStatus = request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "";
        String notes = request.getReviewNotes() != null ? request.getReviewNotes().trim() : "";

        // Lấy phiên bản mới nhất (latest_version) của bài viết để cập nhật kết quả duyệt
        Optional<ArticleVersion> latestVersionOpt = versionRepository
                .findByArticleIdAndVersionNumber(article.getId(), article.getLatestVersion());

        ArticleVersion latestVersion = latestVersionOpt.orElseGet(() -> {
            List<ArticleVersion> allVersions = versionRepository
                    .findByArticleIdOrderByVersionNumberDesc(article.getId());
            if (allVersions.isEmpty()) {
                throw new AppException("Bài viết chưa có phiên bản nội dung nào trong article_versions", HttpStatus.BAD_REQUEST);
            }
            return allVersions.get(0);
        });

        switch (targetStatus) {
            case "IN_REVIEW":
            case "PENDING":
                // Phóng viên gửi bài chờ biên tập viên duyệt
                latestVersion.submitForReview();
                if (article.getStatus() != Article.Status.PUBLISHED) {
                    article.setStatus(Article.Status.PENDING);
                }
                break;

            case "APPROVED":
                // Bước 1 của SV2: Duyệt nội dung phiên bản mới nhất (chờ bấm Xuất bản)
                latestVersion.approve(DEFAULT_EDITOR_USER_ID, notes);
                article.approveReview();
                break;

            case "CHANGES_REQUESTED":
            case "REJECTED":
                // SV2 trả bài yêu cầu phóng viên sửa lại
                if (notes.isEmpty()) {
                    throw new AppException("Vui lòng nhập ghi chú hướng dẫn sửa bài khi từ chối/yêu cầu chỉnh sửa", HttpStatus.BAD_REQUEST);
                }
                latestVersion.reject(DEFAULT_EDITOR_USER_ID, notes);
                article.rejectReview();
                break;

            case "PUBLISHED":
                // Bước 2 của SV2: Xuất bản chính thức lên báo
                latestVersion.approve(DEFAULT_EDITOR_USER_ID, notes);
                article.publish(latestVersion.getVersionNumber(), request.getAccessType(), request.getSinglePrice());
                break;

            case "UNPUBLISHED":
            case "TAKEN_DOWN":
                // SV2 gỡ bài khỏi trang báo công khai
                article.unpublish();
                if (!notes.isEmpty()) {
                    latestVersion.reject(DEFAULT_EDITOR_USER_ID, notes);
                }
                break;

            default:
                throw new AppException("Trạng thái bài viết không hợp lệ: " + targetStatus, HttpStatus.BAD_REQUEST);
        }

        versionRepository.save(latestVersion);
        Article savedArticle = articleRepository.save(article);

        // Ghi vết vào bảng audit_logs
        String oldJson = String.format("{\"status\":\"%s\"}", oldStatus);
        String newJson = String.format("{\"status\":\"%s\",\"uiTarget\":\"%s\",\"version\":%d}",
                savedArticle.getStatus().name(), targetStatus, latestVersion.getVersionNumber());
        try {
            jdbcTemplate.update(
                    "INSERT INTO audit_logs (actor_user_id, action, entity_name, entity_id, old_values_json, new_values_json, created_at) " +
                            "VALUES (?, ?, 'articles', ?, ?, ?, NOW())",
                    DEFAULT_EDITOR_USER_ID,
                    "ARTICLE_STATUS_" + targetStatus,
                    savedArticle.getId(),
                    oldJson,
                    newJson
            );
        } catch (Exception ignored) {
            // Audit log lỗi không được chặn giao dịch nghiệp vụ
        }

        return mapToDto(savedArticle);
    }

    /**
     * Chuyển đổi từ Entity CSDL sang DTO chuẩn cho Frontend React
     */
    private EditorialArticleDto mapToDto(Article article) {
        List<ArticleVersion> versions = versionRepository
                .findByArticleIdOrderByVersionNumberDesc(article.getId());

        ArticleVersion activeVersion = versions.isEmpty() ? null : versions.get(0);

        String title = activeVersion != null ? activeVersion.getTitle() : article.getSlug();
        String summary = activeVersion != null && activeVersion.getSapo() != null ? activeVersion.getSapo() : "";
        String content = activeVersion != null && activeVersion.getContent() != null ? activeVersion.getContent() : "";
        String coverImage = activeVersion != null && activeVersion.getCoverImageUrl() != null
                ? activeVersion.getCoverImageUrl()
                : "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1000";
        String reviewFeedback = activeVersion != null ? activeVersion.getReviewFeedback() : null;

        // Trích xuất 30% preview cho bài viết (Quy tắc 3)
        String previewContent = content;
        if (content.length() > 120) {
            int cutIndex = Math.max(80, (int) (content.length() * 0.3));
            previewContent = content.substring(0, Math.min(content.length(), cutIndex)) + "...";
        }

        // Truy vấn tên chuyên mục từ CategoryRepository của Tùng
        String categoryName = "Thời sự";
        String categorySlug = "thoi-su";
        if (article.getCategoryId() != null) {
            Optional<Category> catOpt = categoryRepository.findById(article.getCategoryId());
            if (catOpt.isPresent()) {
                categoryName = catOpt.get().getName();
                categorySlug = catOpt.get().getSlug();
            }
        }

        // Truy vấn tên tác giả từ UserRepository của Huy
        String authorName = "Phóng viên LocalPress";
        if (article.getAuthorId() != null) {
            Optional<User> userOpt = userRepository.findById(article.getAuthorId());
            if (userOpt.isPresent()) {
                authorName = userOpt.get().getFullName();
            }
        }

        // Truy vấn tag bài viết
        List<String> tags = Collections.emptyList();
        try {
            tags = jdbcTemplate.query(
                    "SELECT t.name FROM tags t JOIN article_tags at ON t.tag_id = at.tag_id WHERE at.article_id = ?",
                    (rs, rowNum) -> rs.getString("name"),
                    article.getId()
            );
        } catch (Exception ignored) {
        }

        // Ánh xạ trạng thái từ DB (articles.status + article_versions.review_status) sang trạng thái UI
        String uiStatus = resolveUiStatus(article, activeVersion);

        List<EditorialArticleDto.VersionDto> versionDtos = versions.stream()
                .map(v -> EditorialArticleDto.VersionDto.builder()
                        .versionNumber(v.getVersionNumber())
                        .title(v.getTitle())
                        .sapo(v.getSapo())
                        .content(v.getContent())
                        .changelog(v.getReviewFeedback() != null ? v.getReviewFeedback() : "Phiên bản v" + v.getVersionNumber())
                        .reviewStatus(v.getReviewStatus() != null ? v.getReviewStatus().name() : "DRAFT")
                        .createdAt(v.getCreatedAt())
                        .createdBy(resolveUserName(v.getEditedBy()))
                        .build())
                .collect(Collectors.toList());

        int wordCount = content.isEmpty() ? 100 : content.split("\\s+").length;
        int readTimeMinutes = Math.max(2, (int) Math.ceil(wordCount / 200.0));

        return EditorialArticleDto.builder()
                .id(String.valueOf(article.getId()))
                .title(title)
                .slug(article.getSlug())
                .sapo(summary)
                .content(content)
                .previewContent(previewContent)
                .authorId(String.valueOf(article.getAuthorId()))
                .authorName(authorName)
                .categoryId(String.valueOf(article.getCategoryId()))
                .categoryName(categoryName)
                .categorySlug(categorySlug)
                .coverImage(coverImage)
                .tags(tags)
                .isPremium(Article.AccessType.PREMIUM == article.getAccessType())
                .price(article.getSinglePrice() != null ? article.getSinglePrice() : BigDecimal.ZERO)
                .status(uiStatus)
                .dbStatus(article.getStatus() != null ? article.getStatus().name() : "DRAFT")
                .reviewNotes(reviewFeedback)
                .views(article.getViewCount() != null ? article.getViewCount() : 0L)
                .publishedAt(article.getPublishedAt())
                .createdAt(article.getCreatedAt())
                .updatedAt(article.getUpdatedAt())
                .readTimeMinutes(readTimeMinutes)
                .currentVersion(article.getLatestVersion())
                .publishedVersion(article.getPublishedVersion())
                .versions(versionDtos)
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) return "Phóng viên";
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Phóng viên");
    }

    /**
     * Chuyển đổi trạng thái giữa DB (articles + article_versions) và UI Frontend:
     * - Nếu bài viết có phiên bản mới nhất đang PENDING duyệt -> hiển thị IN_REVIEW để SV2 thấy nút Duyệt / Yêu cầu sửa.
     * - Nếu phiên bản mới nhất đã APPROVED nhưng bài chưa PUBLISHED -> hiển thị APPROVED để SV2 thấy nút Xuất bản ngay.
     * - Nếu phiên bản mới nhất bị REJECTED -> hiển thị CHANGES_REQUESTED.
     * - Nếu bài đang PUBLISHED (và không có bản mới chờ duyệt) -> hiển thị PUBLISHED.
     * - Nếu bài bị TAKEN_DOWN hoặc ARCHIVED -> hiển thị UNPUBLISHED.
     */
    private String resolveUiStatus(Article article, ArticleVersion latestVersion) {
        String artStatus = article.getStatus() != null ? article.getStatus().name() : "DRAFT";
        String verStatus = latestVersion != null && latestVersion.getReviewStatus() != null
                ? latestVersion.getReviewStatus().name() : "DRAFT";

        if ("TAKEN_DOWN".equals(artStatus) || "ARCHIVED".equals(artStatus)) {
            return "UNPUBLISHED";
        }
        if ("REJECTED".equals(artStatus) || "REJECTED".equals(verStatus)) {
            return "CHANGES_REQUESTED";
        }
        if ("PENDING".equals(verStatus)) {
            return "IN_REVIEW";
        }
        if ("PUBLISHED".equals(artStatus)) {
            // Nếu có phiên bản mới hơn published_version vừa được APPROVED và chờ nhấn Xuất bản
            if (latestVersion != null && article.getPublishedVersion() != null
                    && latestVersion.getVersionNumber() > article.getPublishedVersion()
                    && "APPROVED".equals(verStatus)) {
                return "APPROVED";
            }
            return "PUBLISHED";
        }
        if ("PENDING".equals(artStatus) && "APPROVED".equals(verStatus)) {
            return "APPROVED";
        }
        if ("PENDING".equals(artStatus)) {
            return "IN_REVIEW";
        }
        return "DRAFT";
    }
}
