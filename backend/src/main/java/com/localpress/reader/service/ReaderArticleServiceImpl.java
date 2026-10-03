package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReaderArticleServiceImpl implements ReaderArticleService {

    // Giả lập danh sách bài viết (Mock Data) phục vụ UC029, UC030, UC033
    private List<ArticleSummaryResponse> getMockArticleList() {
        List<ArticleSummaryResponse> list = new ArrayList<>();
        list.add(new ArticleSummaryResponse(1L, "Tin tức Thời sự Địa phương 1", "Tóm tắt bài tin thời sự miễn phí", "Thời sự", "FREE", "https://picsum.photos/200", LocalDateTime.now()));
        list.add(new ArticleSummaryResponse(2L, "Phân tích Kinh tế Sâu sắc (Premium)", "Tóm tắt bài phân tích kinh tế trả phí", "Kinh tế", "PREMIUM", "https://picsum.photos/201", LocalDateTime.now()));
        list.add(new ArticleSummaryResponse(3L, "Lễ hội Văn hóa Truyền thống", "Tóm tắt bài viết về lễ hội văn hóa", "Văn hóa", "FREE", "https://picsum.photos/202", LocalDateTime.now()));
        list.add(new ArticleSummaryResponse(4L, "Báo cáo Tài chính Độc quyền (Premium)", "Tóm tắt báo cáo tài chính chuyên sâu", "Kinh tế", "PREMIUM", "https://picsum.photos/203", LocalDateTime.now()));
        return list;
    }

    @Override
    public List<ArticleSummaryResponse> getFeedArticles(String category) {
        List<ArticleSummaryResponse> allArticles = getMockArticleList();

        // UC033: Lọc theo danh mục nếu có tham số category
        if (category != null && !category.trim().isEmpty()) {
            return allArticles.stream()
                    .filter(a -> a.getCategoryName().equalsIgnoreCase(category))
                    .collect(Collectors.toList());
        }

        // UC029: Trả về toàn bộ danh sách bảng tin
        return allArticles;
    }

    @Override
    public List<ArticleSummaryResponse> searchArticles(String keyword) {
        // UC030: Tìm kiếm theo từ khóa trong Tiêu đề hoặc Tóm tắt
        List<ArticleSummaryResponse> allArticles = getMockArticleList();
        if (keyword == null || keyword.trim().isEmpty()) {
            return allArticles;
        }

        String lowerKeyword = keyword.toLowerCase();
        return allArticles.stream()
                .filter(a -> a.getTitle().toLowerCase().contains(lowerKeyword) ||
                        a.getSummary().toLowerCase().contains(lowerKeyword))
                .collect(Collectors.toList());
    }

    @Override
    public ArticleReaderResponse getArticleDetail(Long articleId, Long userId) {
        boolean isPremiumArticle = (articleId % 2 == 0);
        boolean userHasPurchased = (userId != null && userId.equals(100L));

        ArticleReaderResponse response = new ArticleReaderResponse();
        response.setArticleId(articleId);
        response.setTitle("Bài viết mẫu số " + articleId + " về Tin tức Địa phương");
        response.setSummary("Đây là đoạn tóm tắt ngắn của bài viết để hiển thị trên thẻ xem trước.");
        response.setPublishedAt(LocalDateTime.now());

        String fullContent = "Đây là phần nội dung đầy đủ của bài viết tin tức địa phương. " +
                "Nội dung này bao gồm nhiều phân đoạn chi tiết, phân tích sâu sắc về tình hình kinh tế xã hội. " +
                "Độc giả Premium sẽ được trải nghiệm đọc toàn bộ nội dung mà không gặp bất kỳ rào cản nào. " +
                "Đối với độc giả vãng lai hoặc chưa đăng ký gói, hệ thống Server-side Paywall Engine sẽ tự động cắt ngắn bớt nội dung.";

        if (!isPremiumArticle) {
            // UC031: Bài FREE -> Trả đầy đủ nội dung
            response.setAccessType("FREE");
            response.setContent(fullContent);
            response.setHasFullAccess(true);
            response.setPaywallMessage(null);
        } else {
            // UC032: Bài PREMIUM -> Kiểm tra quyền đọc / cắt 30% nội dung
            response.setAccessType("PREMIUM");
            if (userHasPurchased) {
                response.setContent(fullContent);
                response.setHasFullAccess(true);
                response.setPaywallMessage(null);
            } else {
                int previewLength = (int) (fullContent.length() * 0.3);
                String previewContent = fullContent.substring(0, previewLength)
                        + "... [Nội dung đã bị khóa bởi Paywall LocalPress]";

                response.setContent(previewContent);
                response.setHasFullAccess(false);
                response.setPaywallMessage("Bài viết này dành cho tài khoản Premium. Vui lòng đăng nhập hoặc nâng cấp gói để xem tiếp.");
            }
        }

        return response;
    }
}