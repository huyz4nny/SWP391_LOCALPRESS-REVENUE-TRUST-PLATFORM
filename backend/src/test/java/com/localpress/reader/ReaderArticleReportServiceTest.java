package com.localpress.reader;

import com.localpress.reader.repository.ReaderArticleReportRepository;
import com.localpress.reader.service.ReaderArticleReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReaderArticleReportServiceTest {

    private ReaderArticleReportRepository repository;
    private ReaderArticleReportService service;

    @BeforeEach
    void setUp() {
        repository = mock(ReaderArticleReportRepository.class);
        service = new ReaderArticleReportService(repository);
    }

    @Test
    void publishedArticleCreatesPendingReport() {
        when(repository.isPublished(1L)).thenReturn(true);
        when(repository.hasPending(9L, 1L)).thenReturn(false);
        when(repository.insert(9L, 1L, "TYPO", null)).thenReturn(15L);

        var result = service.report(9L, 1L, "TYPO", "  ");

        assertEquals(15L, result.reportId());
        assertEquals("PENDING", result.status());
    }

    @Test
    void unknownReasonDoesNotInsert() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.report(9L, 1L, "SPAM", null));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(repository, never()).insert(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void pendingDuplicateIs409() {
        when(repository.isPublished(1L)).thenReturn(true);
        when(repository.hasPending(9L, 1L)).thenReturn(true);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.report(9L, 1L, "IMAGE_ERROR", "Ảnh vỡ"));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(repository, never()).insert(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void missingArticleIs404() {
        when(repository.isPublished(8L)).thenReturn(false);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.report(9L, 8L, "OTHER", null));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }
}
