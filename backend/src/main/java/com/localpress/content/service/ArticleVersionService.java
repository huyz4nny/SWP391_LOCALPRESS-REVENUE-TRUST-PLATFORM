package com.localpress.content.service;

import com.localpress.content.dto.ArticleVersionSummaryResponse;
import com.localpress.content.entity.Article;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.localpress.content.dto.ArticleVersionDetailResponse;
import com.localpress.content.entity.ArticleVersion;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Objects;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.content.dto.RestoreArticleVersionRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import com.localpress.content.dto.UpdateArticleVersionContentRequest;

@Service
@RequiredArgsConstructor
public class ArticleVersionService {
    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository articleVersionRepository;
    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<ArticleVersionSummaryResponse> getVersions(Long articleId){
        User currentUser = currentUserService.requireCurrentAuthor();

        Article article = articleRepository
                .findByIdAndAuthorId(articleId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết"
                ));

        return articleVersionRepository
                .findByArticleIdOrderByVersionNumberDesc(article.getId())
                .stream()
                .map(version -> new ArticleVersionSummaryResponse(
                        version.getVersionNumber(),
                        version.getTitle(),
                        version.getReviewStatus().name(),
                        version.getEditedBy(),
                        version.getCreatedAt(),
                        Objects.equals(
                                version.getVersionNumber(),
                                article.getLatestVersion()
                        ),
                        Objects.equals(
                                version.getVersionNumber(),
                                article.getPublishedVersion()
                        )
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public ArticleVersionDetailResponse getVersion(
            Long articleId,
            Integer versionNumber
    ) {
        User currentUser = currentUserService.requireCurrentAuthor();

        Article article = articleRepository
                .findByIdAndAuthorId(articleId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết"
                ));

        ArticleVersion version = articleVersionRepository
                .findByArticleIdAndVersionNumber(
                        article.getId(),
                        versionNumber
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy phiên bản"
                ));

        Map<String, Object> metadata = version.getMetadata() == null
                ? Collections.emptyMap()
                : new HashMap<>(version.getMetadata());

        return new ArticleVersionDetailResponse(
                article.getId(),
                version.getVersionNumber(),
                version.getTitle(),
                version.getSapo(),
                version.getContent(),
                version.getCoverImageUrl(),
                metadata,
                version.getReviewStatus().name(),
                version.getReviewFeedback(),
                version.getEditedBy(),
                version.getCreatedAt(),
                Objects.equals(
                        version.getVersionNumber(),
                        article.getLatestVersion()
                ),
                Objects.equals(
                        version.getVersionNumber(),
                        article.getPublishedVersion()
                )
        );
    }

    @Transactional
    public ArticleVersionDetailResponse restoreVersion(
            Long articleId,
            Integer sourceVersionNumber,
            RestoreArticleVersionRequest request
    ) {
        User currentUser = currentUserService.requireCurrentAuthor();

        // Kiểm tra owner và khóa article trước khi cấp số version mới.
        Article article = articleRepository
                .findOwnedArticleForUpdate(articleId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết"
                ));

        if (!Objects.equals(
                article.getLatestVersion(),
                request.expectedLatestVersion()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bài viết đã có thay đổi. Vui lòng tải lại lịch sử phiên bản"
            );
        }

        if (article.getStatus() != Article.Status.DRAFT
                && article.getStatus() != Article.Status.REJECTED
                && article.getStatus() != Article.Status.PUBLISHED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể khôi phục bài đang chờ duyệt, lưu trữ hoặc đã gỡ"
            );
        }

        ArticleVersion latestVersion = articleVersionRepository
                .findVersionForUpdate(
                        article.getId(),
                        article.getLatestVersion()
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Không tìm thấy phiên bản mới nhất"
                ));

        boolean pendingReview =
                latestVersion.getReviewStatus()
                        == ArticleVersion.ReviewStatus.PENDING;

        boolean approvedButNotPublished =
                latestVersion.getReviewStatus()
                        == ArticleVersion.ReviewStatus.APPROVED
                        && !Objects.equals(
                        latestVersion.getVersionNumber(),
                        article.getPublishedVersion()
                );

        if (pendingReview || approvedButNotPublished) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Phiên bản mới nhất đang chờ duyệt hoặc chờ xuất bản"
            );
        }

        ArticleVersion sourceVersion;

        if (Objects.equals(
                sourceVersionNumber,
                latestVersion.getVersionNumber()
        )) {
            sourceVersion = latestVersion;
        } else {
            sourceVersion = articleVersionRepository
                    .findVersionForUpdate(
                            article.getId(),
                            sourceVersionNumber
                    )
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Không tìm thấy phiên bản cần khôi phục"
                    ));
        }

        if (article.getLatestVersion() == Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Đã đạt giới hạn số phiên bản"
            );
        }

        int newVersionNumber = article.getLatestVersion() + 1;

        Map<String, Object> copiedMetadata =
                sourceVersion.getMetadata() == null
                        ? new HashMap<>()
                        : objectMapper.convertValue(
                        sourceVersion.getMetadata(),
                        new TypeReference<Map<String, Object>>() {}
                );

        ArticleVersion restoredVersion = ArticleVersion.restoreAsDraft(
                sourceVersion,
                currentUser.getId(),
                newVersionNumber,
                copiedMetadata,
                request.changelog()
        );

        article.advanceRestoredDraft(newVersionNumber);

        restoredVersion =
                articleVersionRepository.saveAndFlush(restoredVersion);

        articleRepository.saveAndFlush(article);

        // Đọc created_at do database sinh.
        entityManager.refresh(restoredVersion);

        return getVersion(article.getId(), newVersionNumber);
    }

    @Transactional
    public ArticleVersionDetailResponse updateVersionContent(
            Long articleId,
            Integer versionNumber,
            UpdateArticleVersionContentRequest request
    ) {
        User currentUser = currentUserService.requireCurrentAuthor();

        // Cùng thứ tự khóa với restore: article trước, version sau.
        Article article = articleRepository
                .findOwnedArticleForUpdate(articleId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết"
                ));

        if (!Objects.equals(
                versionNumber,
                article.getLatestVersion()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Đây không còn là phiên bản mới nhất. Vui lòng tải lại bản nháp"
            );
        }

        ArticleVersion version = articleVersionRepository
                .findVersionForUpdate(article.getId(), versionNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy phiên bản"
                ));

        ArticleDraftPolicy.requireEditable(article, version);

        version.updateDraftContent(
                request.title(),
                request.sapo(),
                request.content(),
                request.changelog()
        );

        articleVersionRepository.saveAndFlush(version);

        return getVersion(article.getId(), versionNumber);
    }

    @Transactional
    public ArticleVersionDetailResponse submitVersionForReview(
            Long articleId,
            Integer versionNumber
    ) {
        User currentUser = currentUserService.requireCurrentAuthor();

        // Same lock order as restore/update: article first, version second.
        Article article = articleRepository
                .findOwnedArticleForUpdate(articleId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết"
                ));

        if (!Objects.equals(versionNumber, article.getLatestVersion())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Đây không còn là phiên bản mới nhất. Vui lòng tải lại bản nháp"
            );
        }

        ArticleVersion version = articleVersionRepository
                .findVersionForUpdate(article.getId(), versionNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy phiên bản"
                ));

        ArticleDraftPolicy.requireEditable(article, version);

        if (version.getTitle() == null || version.getTitle().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập tiêu đề trước khi gửi duyệt"
            );
        }
        if (version.getContent() == null || version.getContent().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập nội dung trước khi gửi duyệt"
            );
        }

        version.submitForReview();

        // A pending revision must not take the currently published article offline.
        if (article.getStatus() == Article.Status.DRAFT) {
            article.setStatus(Article.Status.PENDING);
        }

        articleVersionRepository.saveAndFlush(version);
        articleRepository.saveAndFlush(article);

        return getVersion(article.getId(), versionNumber);
    }
}
