package com.localpress.content.service;

import com.localpress.content.dto.ArticleDraftDetailResponse;
import com.localpress.content.dto.CoverImageInfoRequest;
import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.core.io.Resource;
import java.io.IOException;

@Service
@Validated
@RequiredArgsConstructor
@Slf4j
public class ArticleMediaService {

    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository articleVersionRepository;
    private final CurrentUserService currentUserService;
    private final ImageStorageService imageStorageService;
    private final ArticleImageCleanupService articleImageCleanupService;

    @Transactional
    public String uploadCoverImage(Long articleId, MultipartFile file, @NotNull @Valid CoverImageInfoRequest request) {
        User author = currentUserService.requireCurrentAuthor();

        Article article = articleRepository.findOwnedArticleForUpdate(articleId, author.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết"));

        if(article.getStatus() != Article.Status.DRAFT){
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ được cập nhật ảnh của bản nháp");
        }

        ArticleVersion version = articleVersionRepository
                .findVersionForUpdate(article.getId(), article.getLatestVersion())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không tìm thấy phiên bản mới nhất"));

        if(version.getReviewStatus() != ArticleVersion.ReviewStatus.DRAFT){
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phiên bản không ở trạng thái nháp");
        }

        String oldImageUrl = version.getCoverImageUrl();

        String filename = imageStorageService.store(file);
        registerImageCleanup(filename, oldImageUrl);
        String imageUrl = "/api/v1/content/images/" + filename;

        version.updateDraftCoverImage(imageUrl, request.caption(), request.altText(), request.imageSource());

        articleVersionRepository.saveAndFlush(version);

        return imageUrl;

    }

    private void registerImageCleanup(String newFilename, String oldImageUrl) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status){
                try{
                    if(status == STATUS_ROLLED_BACK){
                        imageStorageService.delete(newFilename);
                    } else if(status == STATUS_COMMITTED){
                        articleImageCleanupService.deleteIfUnused(oldImageUrl);
                    }
                }catch(IOException | RuntimeException exception){
                    log.error("Không hoàn tất dọn ảnh: status={}, newFile={}, oldUrl={}", status,newFilename, oldImageUrl, exception);
                }
            }
        });
    }

    @Transactional
    public ArticleDraftDetailResponse updateCoverImageInfo(
            Long articleId,
            @NotNull @Valid CoverImageInfoRequest request
    ) {
        User author = currentUserService.requireCurrentAuthor();

        Article article = articleRepository
                .findOwnedArticleForUpdate(articleId, author.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết"
                ));

        if (article.getStatus() != Article.Status.DRAFT) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ được cập nhật thông tin ảnh của bản nháp"
            );
        }

        ArticleVersion version = articleVersionRepository
                .findVersionForUpdate(
                        article.getId(),
                        article.getLatestVersion()
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Không tìm thấy phiên bản mới nhất"
                ));

        if (version.getReviewStatus() != ArticleVersion.ReviewStatus.DRAFT) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Phiên bản không ở trạng thái bản nháp"
            );
        }

        String imageUrl = version.getCoverImageUrl();

        if (imageUrl == null || imageUrl.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bản nháp chưa có ảnh bìa"
            );
        }

        version.updateDraftCoverImage(
                imageUrl,
                request.caption(),
                request.altText(),
                request.imageSource()
        );

        articleVersionRepository.saveAndFlush(version);

        return ArticleDraftDetailResponse.from(article, version);
    }

    @Transactional(readOnly = true)
    public Resource getCoverImage(String filename) {
        User author = currentUserService.requireCurrentAuthor();

        String imageUrl = "/api/v1/content/images/" + filename;

        articleVersionRepository.findOwnedDraftCoverImage(
                author.getId(),
                Article.Status.DRAFT,
                imageUrl
        ).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Không tìm thấy ảnh của bản nháp"
        ));

        return imageStorageService.load(filename);
    }
}
