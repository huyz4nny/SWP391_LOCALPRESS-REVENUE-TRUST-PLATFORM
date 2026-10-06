package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.repository.ArticleProjection;
import com.localpress.reader.repository.ArticleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReaderArticleServiceImpl implements ReaderArticleService {

    @Autowired
    private ArticleRepository articleRepository;

    @Override
    public List<ArticleSummaryResponse> getPublishedArticles() {
        List<ArticleProjection> projections = articleRepository.findAllPublishedArticles("PUBLISHED");
        return projections.stream().map(p -> {
            ArticleSummaryResponse dto = new ArticleSummaryResponse();
            dto.setId(p.getId());
            dto.setTitle(p.getTitle());
            dto.setSummary(p.getSummary());
            dto.setAccessType(p.getAccessType());
            dto.setCategoryName(p.getCategoryName());
            // Ep kieu LocalDateTime sang String
            dto.setPublishedAt(p.getPublishedAt() != null ? p.getPublishedAt().toString() : null);
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    public List<ArticleSummaryResponse> getFeedArticles(String category) {
        List<ArticleProjection> projections = articleRepository.findFeedArticlesByCategory(category);
        return projections.stream().map(p -> {
            ArticleSummaryResponse dto = new ArticleSummaryResponse();
            dto.setId(p.getId());
            dto.setTitle(p.getTitle());
            dto.setSummary(p.getSummary());
            dto.setAccessType(p.getAccessType());
            dto.setCategoryName(p.getCategoryName());
            // Ep kieu LocalDateTime sang String
            dto.setPublishedAt(p.getPublishedAt() != null ? p.getPublishedAt().toString() : null);
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    public ArticleReaderResponse getArticleById(Long id) {
        ArticleProjection p = articleRepository.findPublishedArticleById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay bai viet voi ID: " + id));

        ArticleReaderResponse response = new ArticleReaderResponse();
        response.setId(p.getId());
        response.setTitle(p.getTitle());
        response.setSummary(p.getSummary());
        response.setAccessType(p.getAccessType());
        response.setCategoryName(p.getCategoryName());
        // Ep kieu LocalDateTime sang String
        response.setPublishedAt(p.getPublishedAt() != null ? p.getPublishedAt().toString() : null);

        // Ap dung Rule 3 Paywall cho bai viet PREMIUM
        String rawContent = p.getContent();
        if ("PREMIUM".equalsIgnoreCase(p.getAccessType()) && rawContent != null) {
            int cutLength = (int) (rawContent.length() * 0.7); // Lay 70% noi dung
            String previewContent = rawContent.substring(0, cutLength);
            response.setContent(previewContent + "\n\n[Dành riêng cho hội viên VIP. Vui lòng nâng cấp tài khoản để đọc tiếp!]");
        } else {
            response.setContent(rawContent);
        }

        return response;
    }
}