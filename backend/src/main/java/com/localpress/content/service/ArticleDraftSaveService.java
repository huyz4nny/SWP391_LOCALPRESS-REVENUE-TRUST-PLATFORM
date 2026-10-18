package com.localpress.content.service;

import com.localpress.content.dto.*;
import com.localpress.content.entity.*;
import com.localpress.content.repository.*;
import com.localpress.identity.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.net.URI;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ArticleDraftSaveService {
    private final ArticleDraftService articleDraftService;
    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository articleVersionRepository;
    private final CategoryRepository categoryRepository;
    private final CurrentUserService currentUserService;
    private final ArticleMediaService articleMediaService;
    private final ArticleImageCleanupService articleImageCleanupService;

    @Transactional
    public ArticleDraftDetailResponse create(SaveArticleDraftRequest request, MultipartFile file,
                                             CoverImageInfoRequest info) {
        Article article = articleDraftService.createDraft(new CreateArticleDraftRequest(
                request.categoryId(), request.title(), request.sapo(), request.content(), null));
        return update(article.getId(), request, file, info);
    }

    @Transactional
    public ArticleDraftDetailResponse update(Long id, SaveArticleDraftRequest request, MultipartFile file,
                                             CoverImageInfoRequest info) {
        var user = currentUserService.requireCurrentAuthor();
        Article article = articleRepository.findOwnedArticleForUpdate(id, user.getId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết"));
        if (article.getStatus() != Article.Status.DRAFT) {
            throw error(HttpStatus.CONFLICT, "Chỉ được lưu bài đang ở trạng thái bản nháp");
        }
        ArticleVersion version = articleVersionRepository.findVersionForUpdate(id, article.getLatestVersion())
                .orElseThrow(() -> error(HttpStatus.INTERNAL_SERVER_ERROR, "Không tìm thấy phiên bản mới nhất"));
        if (version.getReviewStatus() != ArticleVersion.ReviewStatus.DRAFT) {
            throw error(HttpStatus.CONFLICT, "Phiên bản không ở trạng thái bản nháp");
        }
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Chuyên mục không tồn tại"));
        if (category.getStatus() != Category.Status.ACTIVE) {
            throw error(HttpStatus.BAD_REQUEST, "Chuyên mục đã ngừng hoạt động");
        }
        boolean premium = request.isPremium() == null
                ? article.getAccessType() == Article.AccessType.PREMIUM : request.isPremium();
        BigDecimal price = request.price() == null ? article.getSinglePrice() : request.price();
        if (premium && (price == null || price.signum() <= 0)) {
            throw error(HttpStatus.BAD_REQUEST, "Bài Premium cần giá lớn hơn 0");
        }
        CoverImageInfoRequest imageInfo = info == null ? request.imageInfo() : info;
        if (file != null && imageInfo == null) {
            throw error(HttpStatus.BAD_REQUEST, "Vui lòng nhập thông tin ảnh");
        }
        String oldUrl = version.getCoverImageUrl();
        String newUrl = request.coverImageUrl();
        if (file == null && newUrl != null && !newUrl.isBlank()) {
            if (newUrl.startsWith("/api/v1/content/images/")) {
                if (!Objects.equals(newUrl, oldUrl)) {
                    throw error(HttpStatus.BAD_REQUEST, "Không được gắn ảnh lưu trữ của bài khác");
                }
            } else {
                try {
                    URI uri = URI.create(newUrl);
                    if (uri.getHost() == null || !("https".equalsIgnoreCase(uri.getScheme())
                            || "http".equalsIgnoreCase(uri.getScheme()))) throw new IllegalArgumentException();
                } catch (IllegalArgumentException exception) {
                    throw error(HttpStatus.BAD_REQUEST, "URL ảnh phải là HTTP hoặc HTTPS hợp lệ");
                }
            }
        }
        article.updateDraftMetadata(category.getId(), article.getSlug());
        article.configureDraftAccess(premium, price);
        version.updateDraftContent(request.title(), request.sapo(), request.content(), request.changelog());
        version.updateDraftPresentation(file == null ? newUrl : null, request.tags());
        articleRepository.saveAndFlush(article);
        articleVersionRepository.saveAndFlush(version);
        if (file != null) {
            articleMediaService.uploadCoverImage(id, file, imageInfo);
        } else {
            if (imageInfo != null) articleMediaService.updateCoverImageInfo(id, imageInfo);
            if (!Objects.equals(oldUrl, version.getCoverImageUrl())) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override public void afterCommit() { articleImageCleanupService.deleteIfUnused(oldUrl); }
                });
            }
        }
        return ArticleDraftDetailResponse.from(article, version);
    }

    private static ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
