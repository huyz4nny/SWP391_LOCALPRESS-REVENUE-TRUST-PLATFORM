package com.localpress.editorial.service;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.entity.Category;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.content.repository.CategoryRepository;
import com.localpress.content.service.ImageStorageService;
import com.localpress.editorial.dto.EditorialArticleDto;
import com.localpress.editorial.dto.SaveEditorialArticleRequest;
import com.localpress.editorial.dto.UpdateArticleStatusRequest;
import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

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

    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository versionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ImageStorageService imageStorageService;

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
     */
    @Transactional
    public EditorialArticleDto updateArticleStatus(Long articleId, UpdateArticleStatusRequest request) {
        return updateArticleStatus(articleId, request, null);
    }

    @Transactional
    public EditorialArticleDto updateArticleStatus(Long articleId, UpdateArticleStatusRequest request, String email) {
        Long editorUserId = resolveUserId(email);

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
                latestVersion.approve(editorUserId, notes);
                article.approveReview();
                break;

            case "CHANGES_REQUESTED":
            case "REJECTED":
                // SV2 trả bài yêu cầu phóng viên sửa lại
                if (notes.isEmpty()) {
                    throw new AppException("Vui lòng nhập ghi chú hướng dẫn sửa bài khi từ chối/yêu cầu chỉnh sửa", HttpStatus.BAD_REQUEST);
                }
                latestVersion.reject(editorUserId, notes);
                article.rejectReview();
                break;

            case "PUBLISHED":
                // Bước 2 của SV2: Xuất bản chính thức lên báo
                latestVersion.approve(editorUserId, notes);
                article.publish(latestVersion.getVersionNumber(), request.getAccessType(), request.getSinglePrice());
                break;

            case "UNPUBLISHED":
            case "TAKEN_DOWN":
                // SV2 gỡ bài khỏi trang báo công khai
                article.unpublish();
                if (!notes.isEmpty()) {
                    latestVersion.reject(editorUserId, notes);
                }
                break;

            default:
                throw new AppException("Trạng thái bài viết không hợp lệ: " + targetStatus, HttpStatus.BAD_REQUEST);
        }

        versionRepository.save(latestVersion);
        Article savedArticle = articleRepository.save(article);

        // Ghi vết vào bảng audit_logs với cột chuẩn (user_id, action, target_type, target_id)
        String oldJson = String.format("{\"status\":\"%s\"}", oldStatus);
        String newJson = String.format("{\"status\":\"%s\",\"uiTarget\":\"%s\",\"version\":%d}",
                savedArticle.getStatus().name(), targetStatus, latestVersion.getVersionNumber());
        try {
            jdbcTemplate.update(
                    "INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, new_value, created_at) " +
                            "VALUES (?, ?, 'articles', ?, ?, ?, NOW())",
                    editorUserId,
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
     * Soạn bài mới từ phía Tòa soạn (POST /api/v1/editorial/articles)
     */
    @Transactional
    public EditorialArticleDto createArticle(
            SaveEditorialArticleRequest request,
            MultipartFile file,
            String infoJson,
            String email
    ) {
        Long authorId = resolveUserId(email);
        Long categoryId = resolveCategoryId(request.resolveCategoryId());
        String title = request.resolveTitle();
        String sapo = request.resolveSapo();
        String content = request.resolveContent();
        String slug = generateUniqueSlug(title);

        Article article = Article.createDraft(categoryId, authorId, slug);
        boolean isPremium = request.resolveIsPremium();
        BigDecimal price = isPremium ? request.resolvePrice() : BigDecimal.ZERO;
        if (isPremium && price.compareTo(BigDecimal.ZERO) <= 0) {
            price = BigDecimal.valueOf(15000);
        }
        article.configureDraftAccess(isPremium, price);
        article.advanceDraftVersion(1);
        Article savedArticle = articleRepository.save(article);

        ArticleVersion version = ArticleVersion.createDraft(
                savedArticle.getId(),
                authorId,
                1,
                title,
                sapo,
                content,
                "Khởi tạo bản thảo tòa soạn"
        );

        String coverUrl = null;
        if (file != null && !file.isEmpty()) {
            String filename = imageStorageService.store(file);
            coverUrl = "/api/v1/content/images/" + filename;
            version.updateDraftCoverImage(coverUrl, "Ảnh bìa", title, "LocalPress");
        } else if (request.resolveCoverImageUrl() != null) {
            coverUrl = request.resolveCoverImageUrl();
            version.updateDraftPresentation(coverUrl, request.resolveTags());
        }

        String targetStatus = request.resolveStatus();
        if ("IN_REVIEW".equalsIgnoreCase(targetStatus) || "PENDING".equalsIgnoreCase(targetStatus)) {
            version.submitForReview();
            savedArticle.setStatus(Article.Status.PENDING);
            savedArticle = articleRepository.save(savedArticle);
        }

        versionRepository.save(version);

        // Lưu tags nếu có
        List<String> tags = request.resolveTags();
        if (tags != null && !tags.isEmpty()) {
            for (String tag : tags) {
                if (tag == null || tag.isBlank()) continue;
                String tagName = tag.trim();
                String tagSlug = toSlug(tagName);
                try {
                    jdbcTemplate.update("INSERT IGNORE INTO tags (name, slug) VALUES (?, ?)", tagName, tagSlug);
                    List<Long> tagIds = jdbcTemplate.query("SELECT tag_id FROM tags WHERE slug = ?", (rs, r) -> rs.getLong(1), tagSlug);
                    if (!tagIds.isEmpty()) {
                        jdbcTemplate.update("INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)", savedArticle.getId(), tagIds.get(0));
                    }
                } catch (Exception ignored) {
                }
            }
        }

        // Ghi log audit
        try {
            jdbcTemplate.update(
                    "INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value, created_at) " +
                            "VALUES (?, 'ARTICLE_CREATE', 'articles', ?, ?, NOW())",
                    authorId,
                    savedArticle.getId(),
                    String.format("{\"title\":\"%s\",\"status\":\"%s\"}", title, savedArticle.getStatus().name())
            );
        } catch (Exception ignored) {
        }

        return mapToDto(savedArticle);
    }

    /**
     * Sửa bài viết / bản thảo (PUT /api/v1/editorial/articles/{id})
     */
    @Transactional
    public EditorialArticleDto updateArticle(
            Long articleId,
            SaveEditorialArticleRequest request,
            MultipartFile file,
            String infoJson,
            String email
    ) {
        Long userId = resolveUserId(email);
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new AppException("Không tìm thấy bài viết với ID: " + articleId, HttpStatus.NOT_FOUND));

        if (request.resolveCategoryId() != null) {
            Long newCatId = resolveCategoryId(request.resolveCategoryId());
            article.updateDraftMetadata(newCatId, article.getSlug());
        }

        boolean isPremium = request.resolveIsPremium();
        BigDecimal price = isPremium ? request.resolvePrice() : BigDecimal.ZERO;
        if (isPremium && price.compareTo(BigDecimal.ZERO) <= 0) {
            price = BigDecimal.valueOf(15000);
        }
        if (article.getStatus() == Article.Status.DRAFT) {
            article.configureDraftAccess(isPremium, price);
        }

        Optional<ArticleVersion> latestVersionOpt = versionRepository
                .findByArticleIdAndVersionNumber(article.getId(), article.getLatestVersion());

        ArticleVersion latestVersion = latestVersionOpt.orElseGet(() -> {
            List<ArticleVersion> all = versionRepository.findByArticleIdOrderByVersionNumberDesc(article.getId());
            if (all.isEmpty()) {
                throw new AppException("Bài viết chưa có phiên bản nào", HttpStatus.BAD_REQUEST);
            }
            return all.get(0);
        });

        try {
            latestVersion.updateDraftContent(
                    request.resolveTitle(),
                    request.resolveSapo(),
                    request.resolveContent(),
                    request.resolveChangelog()
            );
        } catch (Exception ignored) {
        }

        if (file != null && !file.isEmpty()) {
            String filename = imageStorageService.store(file);
            latestVersion.updateDraftCoverImage("/api/v1/content/images/" + filename, "Ảnh bìa", request.resolveTitle(), "LocalPress");
        } else if (request.resolveCoverImageUrl() != null) {
            latestVersion.updateDraftPresentation(request.resolveCoverImageUrl(), request.resolveTags());
        }

        String targetStatus = request.resolveStatus();
        if ("IN_REVIEW".equalsIgnoreCase(targetStatus) || "PENDING".equalsIgnoreCase(targetStatus)) {
            latestVersion.submitForReview();
            if (article.getStatus() != Article.Status.PUBLISHED) {
                article.setStatus(Article.Status.PENDING);
            }
        }

        versionRepository.save(latestVersion);
        Article savedArticle = articleRepository.save(article);

        // Ghi vết vào audit_logs
        try {
            jdbcTemplate.update(
                    "INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value, created_at) " +
                            "VALUES (?, 'ARTICLE_UPDATE', 'articles', ?, ?, NOW())",
                    userId,
                    savedArticle.getId(),
                    String.format("{\"version\":%d,\"status\":\"%s\"}", latestVersion.getVersionNumber(), savedArticle.getStatus().name())
            );
        } catch (Exception ignored) {
        }

        return mapToDto(savedArticle);
    }

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

    private Long resolveCategoryId(Object catIdObj) {
        if (catIdObj == null) {
            return 1L;
        }
        String str = String.valueOf(catIdObj).trim();
        if (str.startsWith("cat-")) {
            str = str.substring(4);
        }
        Optional<Category> bySlug = categoryRepository.findBySlug(str);
        if (bySlug.isPresent()) {
            return bySlug.get().getId();
        }
        try {
            Long numericId = Long.parseLong(str);
            if (categoryRepository.existsById(numericId)) {
                return numericId;
            }
        } catch (NumberFormatException ignored) {
        }
        List<Category> all = categoryRepository.findAll();
        return all.isEmpty() ? 1L : all.get(0).getId();
    }

    private String generateUniqueSlug(String title) {
        String base = title == null || title.isBlank() ? "bai-viet" : toSlug(title);
        String candidate = base;
        int count = 1;
        while (articleRepository.existsBySlug(candidate)) {
            candidate = base + "-" + count;
            count++;
            if (count > 50) {
                candidate = base + "-" + System.currentTimeMillis();
                break;
            }
        }
        return candidate;
    }

    private static String toSlug(String input) {
        if (input == null) return "";
        String normalized = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        String slug = java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+").matcher(normalized).replaceAll("");
        slug = slug.toLowerCase().replaceAll("[^a-z0-9\\s-]", "");
        slug = slug.replaceAll("[\\s-]+", " ").trim().replaceAll(" ", "-");
        return slug.length() > 200 ? slug.substring(0, 200) : slug;
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
