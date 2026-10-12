package com.localpress.reader;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.repository.ArticleProjection;
import com.localpress.reader.repository.ReaderArticleRepository;
import com.localpress.reader.service.ReaderArticleServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReaderArticleServiceTest {

    @Mock
    private ReaderArticleRepository readerArticleRepository;

    @InjectMocks
    private ReaderArticleServiceImpl readerArticleService;

    @Test
    void freeArticleReturnsFullContentAndIsNotLocked() {
        ArticleProjection projection = mock(ArticleProjection.class);
        when(projection.getAccessType()).thenReturn("FREE");
        when(projection.getContent()).thenReturn("Nội dung miễn phí đầy đủ.");
        when(readerArticleRepository.findPublishedBySlug("bai-free")).thenReturn(Optional.of(projection));

        ArticleReaderResponse response = readerArticleService.getArticleBySlug("bai-free");

        assertFalse(response.getIsLocked());
        assertFalse(response.getIsPremium());
        assertEquals("Nội dung miễn phí đầy đủ.", response.getContent());
        verify(readerArticleRepository).incrementViewCount("bai-free");
    }

    @Test
    void premiumArticleKeepsOnlyThirtyPercentAndDropsTheRest() {
        String full = "1234567890".repeat(10);
        ArticleProjection projection = mock(ArticleProjection.class);
        when(projection.getAccessType()).thenReturn("PREMIUM");
        when(projection.getContent()).thenReturn(full);
        when(readerArticleRepository.findPublishedBySlug("bai-vip")).thenReturn(Optional.of(projection));

        ArticleReaderResponse response = readerArticleService.getArticleBySlug("bai-vip");

        assertTrue(response.getIsLocked());
        assertTrue(response.getIsPremium());
        assertNull(response.getContent());
        assertEquals(full.substring(0, 30), response.getPreviewContent());
        assertFalse(response.getPreviewContent().contains(full.substring(30)));
    }

    @Test
    void missingOrUnpublishedSlugReturns404() {
        when(readerArticleRepository.findPublishedBySlug("khong-co")).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> readerArticleService.getArticleBySlug("khong-co"));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        assertEquals("Không tìm thấy bài viết hoặc bài chưa được xuất bản", error.getReason());
        verify(readerArticleRepository, org.mockito.Mockito.never()).incrementViewCount(any());
    }

    @Test
    void premiumPreviewNeverExceedsThirtyPercentAndHidesTheTail() {
        String tail = "PHAN_BI_KHOA_TUYET_DOI_KHONG_DUOC_LO";
        String full = "Mot hai ba bon nam sau bay tam chin muoi ".repeat(8) + tail;
        ArticleProjection projection = mock(ArticleProjection.class);
        when(projection.getAccessType()).thenReturn("PREMIUM");
        when(projection.getContent()).thenReturn(full);
        when(readerArticleRepository.findPublishedBySlug("bai-vip-dai")).thenReturn(Optional.of(projection));

        ArticleReaderResponse response = readerArticleService.getArticleBySlug("bai-vip-dai");

        assertTrue(response.getIsLocked());
        assertNull(response.getContent());
        assertTrue(response.getPreviewContent().length() <= (int) Math.floor(full.length() * 0.3d));
        assertFalse(response.getPreviewContent().contains(tail));
        assertTrue(full.startsWith(response.getPreviewContent()));
    }

    @Test
    void blankSearchAndCategoryAreNormalizedToNull() {
        when(readerArticleRepository.findAllPublishedArticles(isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        readerArticleService.getArticles("  ", "", null, Pageable.unpaged());

        verify(readerArticleRepository).findAllPublishedArticles(isNull(), isNull(), isNull(), any(Pageable.class));
    }

    @Test
    void premiumListItemIsMarkedPremiumWithoutAnyBody() {
        ArticleProjection projection = mock(ArticleProjection.class);
        when(projection.getAccessType()).thenReturn("PREMIUM");
        when(projection.getViewCount()).thenReturn(3420L);
        when(readerArticleRepository.findAllPublishedArticles(isNull(), isNull(), eq("PREMIUM"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(projection)));

        ArticleSummaryResponse row = readerArticleService.getArticles(null, null, "PREMIUM", Pageable.unpaged())
                .getContent().get(0);

        assertTrue(row.getIsPremium());
        assertEquals(3420L, row.getViewCount());
    }

    @Test
    void listPassesSearchCategoryAndAccessWithoutLoadingBody() {
        ArticleProjection projection = mock(ArticleProjection.class);
        when(projection.getAccessType()).thenReturn("FREE");
        when(projection.getTitle()).thenReturn("FDI");
        when(readerArticleRepository.findAllPublishedArticles(eq("kinh-te"), eq("FDI"), eq("FREE"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(projection)));

        var page = readerArticleService.getArticles("kinh-te", "FDI", "FREE", Pageable.unpaged());

        ArticleSummaryResponse row = page.getContent().get(0);
        assertEquals("FDI", row.getTitle());
        assertFalse(row.getIsPremium());
        verify(readerArticleRepository).findAllPublishedArticles(eq("kinh-te"), eq("FDI"), eq("FREE"), any(Pageable.class));
        verify(readerArticleRepository, org.mockito.Mockito.never()).findPublishedBySlug(isNull());
    }
}