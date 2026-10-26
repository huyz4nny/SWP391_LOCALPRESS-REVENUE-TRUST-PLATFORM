package com.localpress.reader;

import com.localpress.reader.dto.BookmarkStateResponse;
import com.localpress.reader.dto.FollowStateResponse;
import com.localpress.reader.repository.ArticleProjection;
import com.localpress.reader.repository.ReaderArticleRepository;
import com.localpress.reader.repository.ReaderBookmarkRepository;
import com.localpress.reader.repository.ReaderFollowRepository;
import com.localpress.reader.service.ReaderBookmarkService;
import com.localpress.reader.service.ReaderFollowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReaderBookmarkFollowServiceTest {

    private static final Long USER = 6L;

    private ReaderBookmarkRepository bookmarkRepository;
    private ReaderFollowRepository followRepository;
    private ReaderArticleRepository articleRepository;
    private ReaderBookmarkService bookmarkService;
    private ReaderFollowService followService;

    @BeforeEach
    void setUp() {
        bookmarkRepository = mock(ReaderBookmarkRepository.class);
        followRepository = mock(ReaderFollowRepository.class);
        articleRepository = mock(ReaderArticleRepository.class);
        bookmarkService = new ReaderBookmarkService(bookmarkRepository, articleRepository);
        followService = new ReaderFollowService(followRepository, articleRepository);
    }

    private ArticleProjection premiumProjection() {
        ArticleProjection p = mock(ArticleProjection.class);
        when(p.getId()).thenReturn(2L);
        when(p.getTitle()).thenReturn("Bài điều tra");
        when(p.getSlug()).thenReturn("bai-dieu-tra");
        when(p.getAccessType()).thenReturn("PREMIUM");
        when(p.getPublishedAt()).thenReturn(LocalDateTime.of(2026, 10, 20, 8, 0));
        when(p.getSinglePrice()).thenReturn(new BigDecimal("15000.00"));
        return p;
    }

    @Test
    void savePublishedArticleWritesRow() {
        when(bookmarkRepository.isPublishedArticle(1L)).thenReturn(true);

        BookmarkStateResponse res = bookmarkService.save(USER, 1L);

        assertTrue(res.isSaved());
        assertEquals(1L, res.getArticleId());
        verify(bookmarkRepository).save(USER, 1L);
    }

    @Test
    void saveUnpublishedArticleReturns404WithoutWriting() {
        when(bookmarkRepository.isPublishedArticle(9L)).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> bookmarkService.save(USER, 9L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(bookmarkRepository, never()).save(any(), any());
    }

    @Test
    void removeDoesNotRequirePublishedArticle() {
        BookmarkStateResponse res = bookmarkService.remove(USER, 9L);

        assertFalse(res.isSaved());
        verify(bookmarkRepository).remove(USER, 9L);
        verify(bookmarkRepository, never()).isPublishedArticle(any());
    }

    @Test
    void savedArticlesUseSameSummaryMappingAsHomepage() {
        PageRequest pageable = PageRequest.of(0, 20);
        ArticleProjection projection = premiumProjection();
        when(articleRepository.findSavedArticles(USER, pageable)).thenReturn(new PageImpl<>(List.of(projection), pageable, 1));

        Page<com.localpress.reader.dto.ArticleSummaryResponse> page = bookmarkService.getSavedArticles(USER, pageable);

        assertEquals(1, page.getTotalElements());
        assertEquals("bai-dieu-tra", page.getContent().get(0).getSlug());
        assertTrue(page.getContent().get(0).getIsPremium());
        assertEquals(0L, page.getContent().get(0).getViewCount());
    }

    @Test
    void followActiveCategoryWritesRow() {
        when(followRepository.isActiveCategory(2L)).thenReturn(true);

        FollowStateResponse res = followService.follow(USER, 2L);

        assertTrue(res.isFollowing());
        verify(followRepository).follow(USER, 2L);
    }

    @Test
    void followInactiveOrMissingCategoryReturns404WithoutWriting() {
        when(followRepository.isActiveCategory(99L)).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> followService.follow(USER, 99L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(followRepository, never()).follow(any(), any());
    }

    @Test
    void unfollowDoesNotRequireActiveCategory() {
        FollowStateResponse res = followService.unfollow(USER, 99L);

        assertFalse(res.isFollowing());
        verify(followRepository).unfollow(USER, 99L);
        verify(followRepository, never()).isActiveCategory(any());
    }

    @Test
    void feedMapsFollowedArticles() {
        PageRequest pageable = PageRequest.of(0, 20);
        ArticleProjection projection = premiumProjection();
        when(articleRepository.findFollowedFeed(USER, pageable)).thenReturn(new PageImpl<>(List.of(projection), pageable, 1));

        Page<com.localpress.reader.dto.ArticleSummaryResponse> page = followService.getFeed(USER, pageable);

        assertEquals(1, page.getContent().size());
        assertEquals("Bài điều tra", page.getContent().get(0).getTitle());
        assertNull(page.getContent().get(0).getSummary());
    }
}
