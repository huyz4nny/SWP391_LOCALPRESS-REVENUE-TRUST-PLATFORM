package com.localpress.content.service;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.entity.Category;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.content.repository.CategoryRepository;
import com.localpress.content.dto.CreateArticleDraftRequest;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.localpress.content.dto.ArticleDraftDetailResponse;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ArticleDraftService {
    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository articleVersionRepository;
    private final CategoryRepository categoryRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public Article createDraft(CreateArticleDraftRequest request) {
        User author = currentUserService.requireCurrentAuthor();

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chuyên mục không tồn tại"));

        if(category.getStatus() != Category.Status.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chuyên mục đã ngừng hoạt động");
        }

        String slug = "draft-" + UUID.randomUUID();

        Article article = Article.createDraft(category.getId(), author.getId(), slug);

        article = articleRepository.save(article);

        ArticleVersion version = ArticleVersion.createDraft(
                article.getId(),
                author.getId(),
                1,
                request.title().trim(),
                request.sapo(),
                request.content(),
                request.source()
        );

        articleVersionRepository.save(version);

        article.advanceDraftVersion(1);

        return article;
    }

    @Transactional(readOnly = true)
    public ArticleDraftDetailResponse getDraft(Long articleId){
        User author = currentUserService.requireCurrentAuthor();

        Article article = articleRepository.findByIdAndAuthorId(articleId, author.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết"));

        if(article.getStatus() != Article.Status.DRAFT){
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài viết không ở trạng thái bản nháp");
        }

        ArticleVersion version = articleVersionRepository.findByArticleIdAndVersionNumber(article.getId(), article.getLatestVersion())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không tìm thấy phiên bản mới nhất của bài viết"));

        return ArticleDraftDetailResponse.from(article, version);
    }
}
