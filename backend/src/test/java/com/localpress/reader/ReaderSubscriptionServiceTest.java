package com.localpress.reader;

import com.localpress.reader.dto.ReaderSubscriptionResponse;
import com.localpress.reader.repository.ReaderSubscriptionRepository;
import com.localpress.reader.repository.ReaderSubscriptionRepository.SubscriptionRow;
import com.localpress.reader.service.ReaderSubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReaderSubscriptionServiceTest {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 29);
    private static final Long USER = 9L;

    private ReaderSubscriptionRepository repository;
    private ReaderSubscriptionService service;

    @BeforeEach
    void setUp() {
        repository = mock(ReaderSubscriptionRepository.class);
        Clock clock = Clock.fixed(TODAY.atStartOfDay(VIETNAM).toInstant(), VIETNAM);
        service = new ReaderSubscriptionService(repository, clock);
    }

    @Test
    void listMarksCurrentAndUpcoming() {
        when(repository.findActiveNotExpired(USER, TODAY)).thenReturn(List.of(
                row(4L, TODAY.minusDays(1), TODAY.plusDays(30), true),
                row(5L, TODAY.plusDays(31), TODAY.plusDays(60), true)));

        List<ReaderSubscriptionResponse> items = service.listMine(USER);

        assertTrue(items.get(0).inEffect());
        assertFalse(items.get(1).inEffect());
        assertEquals("ALL", items.get(0).accessScope());
    }

    @Test
    void cancelTurnsOffRenewAndKeepsDates() {
        SubscriptionRow active = row(4L, TODAY, TODAY.plusDays(30), true);
        when(repository.findOwned(USER, 4L)).thenReturn(Optional.of(active));
        when(repository.disableAutoRenew(4L, USER)).thenReturn(1);

        ReaderSubscriptionResponse result = service.cancelAutoRenew(USER, 4L);

        assertFalse(result.autoRenew());
        assertEquals(TODAY.plusDays(30), result.endDate());
        assertEquals("ACTIVE", active.status());
        verify(repository).disableAutoRenew(4L, USER);
    }

    @Test
    void cancelAgainDoesNotUpdate() {
        when(repository.findOwned(USER, 4L)).thenReturn(Optional.of(row(4L, TODAY, TODAY.plusDays(30), false)));

        ReaderSubscriptionResponse result = service.cancelAutoRenew(USER, 4L);

        assertFalse(result.autoRenew());
        verify(repository, never()).disableAutoRenew(4L, USER);
    }

    @Test
    void missingSubscriptionReturns404() {
        when(repository.findOwned(USER, 8L)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.cancelAutoRenew(USER, 8L));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verify(repository, never()).disableAutoRenew(8L, USER);
    }

    @Test
    void pendingSubscriptionCannotBeCancelled() {
        when(repository.findOwned(USER, 3L)).thenReturn(Optional.of(
                row(3L, TODAY, TODAY, "PENDING", false)));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.cancelAutoRenew(USER, 3L));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(repository, never()).disableAutoRenew(3L, USER);
    }

    private static SubscriptionRow row(Long id, LocalDate start, LocalDate end, boolean autoRenew) {
        return row(id, start, end, "ACTIVE", autoRenew);
    }

    private static SubscriptionRow row(Long id, LocalDate start, LocalDate end, String status, boolean autoRenew) {
        return new SubscriptionRow(
                id, 1L, "Gói tháng", new BigDecimal("50000"), "ALL", null, null,
                start, end, status, autoRenew, false, false);
    }
}
