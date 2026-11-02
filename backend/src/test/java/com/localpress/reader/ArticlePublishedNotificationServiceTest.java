package com.localpress.reader;

import com.localpress.reader.repository.ReaderNotificationRepository;
import com.localpress.reader.service.ArticlePublishedNotificationService;
import com.localpress.shared.event.ArticlePublishedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ArticlePublishedNotificationServiceTest {

    private ReaderNotificationRepository repository;
    private ArticlePublishedNotificationService service;

    @BeforeEach
    void setUp() {
        repository = mock(ReaderNotificationRepository.class);
        service = new ArticlePublishedNotificationService(repository);
    }

    @Test
    void revisionDoesNotNotify() {
        service.record(event(false, 1L, 2L, "Tiêu đề"));

        verify(repository, never()).findFollowerIds(2L);
    }

    @Test
    void firstPublicationNotifiesEachFollowerOncePerArticle() {
        when(repository.findFollowerIds(2L)).thenReturn(List.of(9L, 10L));

        ArticlePublishedEvent event = event(true, 8L, 2L, "  Cảng mới  ");
        service.record(event);
        service.record(event);

        verify(repository, times(2)).insertInApp(9L, "Cảng mới", "Có bài mới trong chuyên mục bạn theo dõi.", "ARTICLE_PUBLISHED:8:9");
        verify(repository, times(2)).insertInApp(10L, "Cảng mới", "Có bài mới trong chuyên mục bạn theo dõi.", "ARTICLE_PUBLISHED:8:10");
    }

    @Test
    void blankTitleUsesFallbackAndLongTitleIsCut() {
        when(repository.findFollowerIds(2L)).thenReturn(List.of(9L));

        service.record(event(true, 8L, 2L, " "));
        verify(repository).insertInApp(9L, "Bài mới", "Có bài mới trong chuyên mục bạn theo dõi.", "ARTICLE_PUBLISHED:8:9");

        service.record(event(true, 8L, 2L, "A".repeat(300)));
        verify(repository).insertInApp(9L, "A".repeat(255), "Có bài mới trong chuyên mục bạn theo dõi.", "ARTICLE_PUBLISHED:8:9");
    }

    private static ArticlePublishedEvent event(boolean first, Long articleId, Long categoryId, String title) {
        return ArticlePublishedEvent.builder()
                .eventId("evt-1")
                .articleId(articleId)
                .categoryId(categoryId)
                .versionNumber(1)
                .title(title)
                .slug("bai-moi")
                .publishedAt(Instant.parse("2026-10-29T10:00:00Z"))
                .firstPublication(first)
                .build();
    }
}
