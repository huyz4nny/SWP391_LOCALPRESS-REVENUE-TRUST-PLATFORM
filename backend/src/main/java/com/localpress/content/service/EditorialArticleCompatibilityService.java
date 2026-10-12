package com.localpress.content.service;

import com.localpress.content.dto.*;
import com.localpress.content.entity.*;
import com.localpress.content.repository.*;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import jakarta.persistence.EntityManager;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Adapts the existing editorial FE contract to the shared CMS entities and services. */
@Service
@RequiredArgsConstructor
public class EditorialArticleCompatibilityService {
    private final CurrentUserService currentUserService;
    private final ArticleDraftService articleDraftService;
    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository versionRepository;
    private final CategoryRepository categoryRepository;
    private final EntityManager entityManager;
    private final ArticleMediaService articleMediaService;

    @Transactional(readOnly = true)
    public List<EditorialArticleResponse> getDrafts() {
        User editor = currentUserService.requireCurrentEditor();
        return articleRepository.findByAuthorIdAndStatusOrderByIdDesc(editor.getId(), Article.Status.DRAFT)
                .stream().map(article -> response(article, latest(article), editor)).toList();
    }

    @Transactional(readOnly = true)
    public EditorialArticleResponse getDraft(Long id) {
        User editor = currentUserService.requireCurrentEditor();
        Article article = articleRepository.findByIdAndAuthorId(id, editor.getId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy bản nháp của bạn"));
        requireDraft(article);
        return response(article, latest(article), editor);
    }

    @Transactional
    public EditorialArticleResponse create(EditorialArticleRequest request) {
        User editor = currentUserService.requireCurrentEditor();
        requireDraftStatus(request.status());
        Category category = resolveCategory(request.categoryId());
        validatePrice(request);
        Article article = articleDraftService.createDraft(new CreateArticleDraftRequest(
                category.getId(), request.title(), request.sapo(), request.content(), request.source()));
        ArticleVersion version = latest(article);
        applyPresentation(article, version, request);
        articleRepository.saveAndFlush(article);
        versionRepository.saveAndFlush(version);
        entityManager.refresh(article);
        entityManager.refresh(version);
        return response(article, version, editor);
    }

    @Transactional
    public EditorialArticleResponse updateMetadata(Long id, EditorialArticleRequest request) {
        User editor = currentUserService.requireCurrentEditor();
        Article article = articleRepository.findOwnedArticleForUpdate(id, editor.getId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy bản nháp của bạn"));
        requireDraft(article);
        requireDraftStatus(request.status());
        ArticleVersion version = versionRepository.findVersionForUpdate(id, article.getLatestVersion())
                .orElseThrow(() -> error(HttpStatus.INTERNAL_SERVER_ERROR, "Không tìm thấy phiên bản mới nhất"));
        if (request.title() == null || !Objects.equals(request.title().trim(), version.getTitle())
                || !Objects.equals(empty(request.sapo()), empty(version.getSapo()))
                || !Objects.equals(request.content(), version.getContent())) {
            throw error(HttpStatus.CONFLICT,
                    "Iter 1 chưa hỗ trợ sửa tiêu đề, sapo và nội dung đã tạo; chỉ cập nhật metadata/media");
        }
        Category category = resolveCategory(request.categoryId());
        validatePrice(request);
        article.updateDraftMetadata(category.getId(), article.getSlug());
        applyPresentation(article, version, request);
        articleRepository.saveAndFlush(article);
        versionRepository.saveAndFlush(version);
        entityManager.refresh(article);
        return response(article, version, editor);
    }

    @Transactional
    public EditorialArticleResponse createWithCoverImage(EditorialArticleRequest request,
            MultipartFile file, CoverImageInfoRequest info) {
        EditorialArticleResponse created = create(withoutCoverUrl(request));
        Long id = Long.valueOf(created.id());
        articleMediaService.uploadCoverImage(id, file, info);
        return getDraft(id);
    }

    @Transactional
    public EditorialArticleResponse updateWithCoverImage(Long id, EditorialArticleUpdateRequest request,
            MultipartFile file, CoverImageInfoRequest info) {
        // Preserve the old URL until ArticleMediaService replaces and cleans it up.
        updateMetadata(id, withoutCoverUrl(request.article()));
        articleMediaService.uploadCoverImage(id, file, info);
        return getDraft(id);
    }

    @Transactional
    public EditorialArticleResponse updateMetadataAndImageInfo(Long id, EditorialArticleUpdateRequest request) {
        EditorialArticleResponse updated = updateMetadata(id, request.article());
        if (request.imageInfo() != null) {
            articleMediaService.updateCoverImageInfo(id, request.imageInfo());
            return getDraft(id);
        }
        return updated;
    }

    private EditorialArticleRequest withoutCoverUrl(EditorialArticleRequest request) {
        return new EditorialArticleRequest(request.title(), request.sapo(), request.content(), null,
                request.categoryId(), request.tags(), request.isPremium(), request.price(),
                request.status(), request.source());
    }

    private Category resolveCategory(String categoryId) {
        if (categoryId == null || categoryId.isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "Vui lòng chọn chuyên mục");
        }
        String key = categoryId.trim();
        Category category;
        if (key.matches("[1-9][0-9]*")) {
            try {
                category = categoryRepository.findById(Long.parseLong(key))
                        .orElseThrow(() -> error(HttpStatus.BAD_REQUEST, "Chuyên mục không tồn tại"));
            } catch (NumberFormatException exception) {
                throw error(HttpStatus.BAD_REQUEST, "Mã chuyên mục không hợp lệ");
            }
        } else {
            String slug = key.startsWith("cat-") ? key.substring(4) : key;
            category = categoryRepository.findBySlug(slug)
                    .orElseThrow(() -> error(HttpStatus.BAD_REQUEST, "Chuyên mục không tồn tại"));
        }
        if (category.getStatus() != Category.Status.ACTIVE) {
            throw error(HttpStatus.BAD_REQUEST, "Chuyên mục đã ngừng hoạt động");
        }
        return category;
    }

    private void applyPresentation(Article article, ArticleVersion version, EditorialArticleRequest request) {
        article.configureDraftAccess(Boolean.TRUE.equals(request.isPremium()), request.price());
        List<String> tags = request.tags() == null ? null
                : request.tags().stream().map(String::trim).filter(tag -> !tag.isEmpty()).distinct().toList();
        version.updateDraftPresentation(request.coverImage(), tags);
    }

    private void validatePrice(EditorialArticleRequest request) {
        if (Boolean.TRUE.equals(request.isPremium())
                && (request.price() == null || request.price().signum() <= 0)) {
            throw error(HttpStatus.BAD_REQUEST, "Bài Premium cần giá lớn hơn 0");
        }
    }

    private void requireDraftStatus(String status) {
        if (status != null && !"DRAFT".equals(status)) {
            throw error(HttpStatus.CONFLICT, "Iter 1 chỉ hỗ trợ lưu bản nháp DRAFT");
        }
    }

    private void requireDraft(Article article) {
        if (article.getStatus() != Article.Status.DRAFT) {
            throw error(HttpStatus.CONFLICT, "Bài viết không ở trạng thái bản nháp");
        }
    }

    private ArticleVersion latest(Article article) {
        return versionRepository.findByArticleIdAndVersionNumber(article.getId(), article.getLatestVersion())
                .orElseThrow(() -> error(HttpStatus.INTERNAL_SERVER_ERROR, "Không tìm thấy phiên bản mới nhất"));
    }

    private EditorialArticleResponse response(Article article, ArticleVersion version, User editor) {
        Category category = categoryRepository.findById(article.getCategoryId())
                .orElseThrow(() -> error(HttpStatus.INTERNAL_SERVER_ERROR, "Không tìm thấy chuyên mục bài viết"));
        Map<String, Object> metadata = version.getMetadata();
        Object value = metadata == null ? null : metadata.get("tags");
        List<String> tags = value instanceof List<?> list
                ? list.stream().filter(String.class::isInstance).map(String.class::cast).toList() : List.of();
        int words = version.getContent().isBlank() ? 0 : version.getContent().trim().split("\\s+").length;
        String created = date(article.getCreatedAt());
        var snapshot = new EditorialArticleResponse.VersionResponse(version.getVersionNumber(),
                version.getTitle(), empty(version.getSapo()), version.getContent(),
                "Bản nháp", date(version.getCreatedAt()), editor.getFullName());
        return new EditorialArticleResponse(article.getId().toString(), version.getTitle(), article.getSlug(),
                empty(version.getSapo()), version.getContent(), empty(version.getSapo()),
                editor.getId().toString(), editor.getFullName(), "cat-" + category.getSlug(),
                category.getName(), category.getSlug(), empty(version.getCoverImageUrl()),
                metadataString(metadata, "coverCaption"), metadataString(metadata, "coverAltText"),
                metadataString(metadata, "coverSource"), tags,
                article.getAccessType() == Article.AccessType.PREMIUM,
                article.getSinglePrice() == null ? BigDecimal.ZERO : article.getSinglePrice(), "DRAFT",
                version.getReviewFeedback(), article.getViewCount(), date(article.getPublishedAt()), null,
                created, date(article.getUpdatedAt()), Math.max(1, (words + 199) / 200),
                article.getLatestVersion(), List.of(snapshot));
    }

    private static String metadataString(Map<String, Object> metadata, String key) {
        Object value = metadata == null ? null : metadata.get(key);
        return value instanceof String text ? text : null;
    }

    private static String empty(String value) { return value == null ? "" : value; }
    private static String date(LocalDateTime value) { return value == null ? null : value.toString(); }
    private static ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
