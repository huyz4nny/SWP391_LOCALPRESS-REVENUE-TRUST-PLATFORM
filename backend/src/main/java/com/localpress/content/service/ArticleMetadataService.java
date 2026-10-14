package com.localpress.content.service;

import com.localpress.content.dto.ArticleDraftDetailResponse;
import com.localpress.content.dto.UpdateArticleMetadataRequest;
import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.entity.Category;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.content.repository.CategoryRepository;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ArticleMetadataService {

    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository articleVersionRepository;
    private final CategoryRepository categoryRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public ArticleDraftDetailResponse updateMetadata(
            Long articleId,
            UpdateArticleMetadataRequest request
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
                    "Chỉ được cập nhật metadata của bản nháp"
            );
        }

        Category category = categoryRepository
                .findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Chuyên mục không tồn tại"
                ));

        if (category.getStatus() != Category.Status.ACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chuyên mục đã ngừng hoạt động"
            );
        }

        if (articleRepository.existsBySlugAndIdNot(
                request.slug(), article.getId()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Slug đã được bài viết khác sử dụng"
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

        article.updateDraftMetadata(
                category.getId(),
                request.slug()
        );

        try {
            articleRepository.saveAndFlush(article);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể lưu metadata do xung đột dữ liệu",
                    exception
            );
        }

        return ArticleDraftDetailResponse.from(article, version);
    }
}