package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.repository.ArticleProjection;
import com.localpress.reader.repository.ReaderArticleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReaderArticleServiceImpl implements ReaderArticleService {

    private final ReaderArticleRepository readerArticleRepository;

    @Override
    public Page<ArticleSummaryResponse> getArticles(String category, String search, String access, Pageable pageable) {
        return readerArticleRepository
                .findAllPublishedArticles(blankToNull(category), blankToNull(search), blankToNull(access), pageable)
                .map(this::mapToSummary);
    }

    @Override
    @Transactional
    public ArticleReaderResponse getArticleBySlug(String slug) {
        ArticleProjection projection = readerArticleRepository.findPublishedBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết hoặc bài chưa được xuất bản"));
        readerArticleRepository.incrementViewCount(slug);
        return applyPaywall(mapToDetail(projection), projection.getContent(), projection.getAccessType());
    }

    static int previewCut(String rawContent) {
        int cutIndex = (int) Math.floor(rawContent.length() * 0.3d);
        if (cutIndex <= 0) {
            return 0;
        }
        int lastBreak = Math.max(rawContent.lastIndexOf(' ', cutIndex), rawContent.lastIndexOf('\n', cutIndex));
        if (lastBreak > cutIndex / 2) {
            return lastBreak;
        }
        return cutIndex;
    }

    private ArticleReaderResponse applyPaywall(ArticleReaderResponse response, String rawContent, String accessType) {
        boolean premium = "PREMIUM".equalsIgnoreCase(accessType);
        response.setIsPremium(premium);
        if (!premium || rawContent == null) {
            response.setContent(rawContent);
            response.setPreviewContent(rawContent);
            response.setIsLocked(false);
            return response;
        }
        response.setPreviewContent(rawContent.substring(0, previewCut(rawContent)));
        response.setContent(null);
        response.setIsLocked(true);
        return response;
    }

    private ArticleSummaryResponse mapToSummary(ArticleProjection projection) {
        return ArticleSummaryResponse.builder()
                .id(projection.getId())
                .title(projection.getTitle())
                .slug(projection.getSlug())
                .summary(projection.getSummary())
                .coverImageUrl(projection.getCoverImageUrl())
                .categoryName(projection.getCategoryName())
                .categorySlug(projection.getCategorySlug())
                .isPremium("PREMIUM".equalsIgnoreCase(projection.getAccessType()))
                .publishedAt(projection.getPublishedAt() != null ? projection.getPublishedAt().toString() : null)
                .authorName(projection.getAuthorName())
                .build();
    }

    private ArticleReaderResponse mapToDetail(ArticleProjection projection) {
        ArticleSummaryResponse summary = mapToSummary(projection);
        return ArticleReaderResponse.builder()
                .id(summary.getId())
                .title(summary.getTitle())
                .slug(summary.getSlug())
                .summary(summary.getSummary())
                .coverImageUrl(summary.getCoverImageUrl())
                .categoryName(summary.getCategoryName())
                .categorySlug(summary.getCategorySlug())
                .isPremium(summary.getIsPremium())
                .publishedAt(summary.getPublishedAt())
                .authorName(summary.getAuthorName())
                .viewCount(projection.getViewCount() == null ? 1L : projection.getViewCount() + 1)
                .build();
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}