package com.localpress.reader;

import com.localpress.reader.dto.ReadingHistoryItemResponse;
import com.localpress.reader.repository.ReaderHistoryRepository;
import com.localpress.reader.service.ReaderHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReaderHistoryServiceTest {

    private ReaderHistoryRepository repository;
    private ReaderHistoryService service;

    @BeforeEach
    void setUp() {
        repository = mock(ReaderHistoryRepository.class);
        service = new ReaderHistoryService(repository);
    }

    @Test
    void recordQuietlyWritesUpsert() {
        service.recordQuietly(6L, 1L);
        verify(repository).upsert(6L, 1L);
    }

    @Test
    void recordQuietlyDoesNotThrowWhenDatabaseFails() {
        doThrow(new RuntimeException("db")).when(repository).upsert(6L, 1L);
        assertDoesNotThrow(() -> service.recordQuietly(6L, 1L));
    }

    @Test
    void getHistoryUsesCountAndOffset() {
        PageRequest pageable = PageRequest.of(1, 20);
        when(repository.countPublished(6L)).thenReturn(21L);
        when(repository.findPage(6L, 20, 20)).thenReturn(List.of(
                ReadingHistoryItemResponse.builder().articleId(2L).slug("bai-2").build()));

        Page<ReadingHistoryItemResponse> page = service.getHistory(6L, pageable);

        assertEquals(21, page.getTotalElements());
        assertEquals("bai-2", page.getContent().get(0).getSlug());
    }

    @Test
    void removeDeletesRow() {
        service.remove(6L, 9L);
        verify(repository).remove(6L, 9L);
    }
}
