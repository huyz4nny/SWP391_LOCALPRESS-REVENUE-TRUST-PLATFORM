package com.localpress.reader;

import com.localpress.reader.domain.ArticleEntity;
import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.repository.ArticleRepository;
import com.localpress.reader.service.ReaderArticleServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReaderArticleServiceTest {

    @Mock
    private ArticleRepository articleRepository;

    @InjectMocks
    private ReaderArticleServiceImpl readerArticleService;

    private ArticleEntity freeArticle;
    private ArticleEntity premiumArticle;

    @BeforeEach
    void setUp() {
        // Bài viết FREE
        freeArticle = new ArticleEntity();
        freeArticle.setId(1L);
        freeArticle.setTitle("Tin tức thời sự hôm nay");
        freeArticle.setSummary("Tóm tắt tin tức thời sự");
        freeArticle.setContent("Nội dung bài viết miễn phí ngắn gọn đầy đủ thông tin.");
        freeArticle.setAccessType("FREE");
        freeArticle.setStatus("PUBLISHED");
        freeArticle.setCategoryName("Thời sự");
        freeArticle.setPublishedAt(LocalDateTime.now());

        // Bài viết PREMIUM (100 ký tự để test Rule 3 cắt 30%)
        premiumArticle = new ArticleEntity();
        premiumArticle.setId(2L);
        premiumArticle.setTitle("Phân tích chuyên sâu kinh tế");
        premiumArticle.setSummary("Tóm tắt phân tích kinh tế");
        premiumArticle.setContent("1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890");
        premiumArticle.setAccessType("PREMIUM");
        premiumArticle.setStatus("PUBLISHED");
        premiumArticle.setCategoryName("Kinh doanh");
        premiumArticle.setPublishedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Test lấy danh sách bài viết PUBLISHED thành công")
    void getPublishedArticles_Success() {
        when(articleRepository.findByStatus("PUBLISHED")).thenReturn(List.of(freeArticle, premiumArticle));

        List<ArticleSummaryResponse> result = readerArticleService.getPublishedArticles();

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(articleRepository, times(1)).findByStatus("PUBLISHED");
    }

    @Test
    @DisplayName("Test đọc bài FREE - Nội dung giữ nguyên 100%")
    void getArticleById_FreeArticle_FullContent() {
        when(articleRepository.findById(1L)).thenReturn(Optional.of(freeArticle));

        ArticleReaderResponse response = readerArticleService.getArticleById(1L);

        assertNotNull(response);
        assertEquals("Nội dung bài viết miễn phí ngắn gọn đầy đủ thông tin.", response.getContent());
    }

    @Test
    @DisplayName("Test đọc bài PREMIUM - Áp dụng Rule 3 cắt 30% nội dung")
    void getArticleById_PremiumArticle_Truncated30Percent() {
        when(articleRepository.findById(2L)).thenReturn(Optional.of(premiumArticle));

        ArticleReaderResponse response = readerArticleService.getArticleById(2L);

        assertNotNull(response);
        assertTrue(response.getContent().startsWith("123456789012345678901234567890"));
        assertTrue(response.getContent().contains("[Nội dung dành riêng cho hội viên VIP]"));
    }
}