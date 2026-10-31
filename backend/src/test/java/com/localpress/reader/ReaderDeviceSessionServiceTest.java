package com.localpress.reader;

import com.localpress.reader.repository.ReaderDeviceRepository;
import com.localpress.reader.service.ReaderDeviceSessionService;
import com.localpress.shared.device.DeviceLimitReachedException;
import com.localpress.shared.device.RegisteredSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReaderDeviceSessionServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-29T10:00:00Z");
    private static final Instant EXPIRES = NOW.plusSeconds(3600);

    private ReaderDeviceRepository repository;
    private ReaderDeviceSessionService service;

    @BeforeEach
    void setUp() {
        repository = mock(ReaderDeviceRepository.class);
        service = new ReaderDeviceSessionService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void registerWritesOneSessionWhenUnderLimit() {
        when(repository.lockUser(9L)).thenReturn(true);
        when(repository.countActive(9L, NOW)).thenReturn(1);
        when(repository.insert(eq(9L), eq("Máy tính"), eq("DESKTOP"), any(), eq("127.0.0.1"), eq(EXPIRES)))
                .thenReturn(15L);

        RegisteredSession session = service.register(9L, "  Máy tính  ", "desktop", " 127.0.0.1 ", EXPIRES);

        assertEquals(15L, session.deviceId());
        assertFalse(session.sessionId().isBlank());
    }

    @Test
    void thirdActiveSessionIsRejected() {
        when(repository.lockUser(9L)).thenReturn(true);
        when(repository.countActive(9L, NOW)).thenReturn(2);

        DeviceLimitReachedException error = assertThrows(DeviceLimitReachedException.class,
                () -> service.register(9L, "Điện thoại", "MOBILE", null, EXPIRES));

        assertEquals(DeviceLimitReachedException.CODE, error.getCode());
        verify(repository, never()).insert(any(Long.class), any(), any(), any(), any(), any());
    }

    @Test
    void blankNameBecomesDefaultAndMissingExpiryIsRejected() {
        when(repository.lockUser(9L)).thenReturn(true);
        when(repository.countActive(9L, NOW)).thenReturn(0);
        when(repository.insert(eq(9L), eq("Trình duyệt"), eq("DESKTOP"), any(), eq(null), eq(EXPIRES)))
                .thenReturn(4L);

        service.register(9L, "   ", null, "  ", EXPIRES);

        assertThrows(IllegalArgumentException.class, () -> service.register(9L, "Máy", "DESKTOP", null, null));
        assertThrows(IllegalArgumentException.class, () -> service.register(9L, "Máy", "PHONE", null, EXPIRES));
    }

    @Test
    void blankSessionIsInactive() {
        assertFalse(service.isActive("  "));
        verify(repository, never()).isActive(any(), any());
    }

    @Test
    void revokeMissingSessionReturns404() {
        when(repository.revoke(9L, 3L, NOW)).thenReturn(0);

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.revoke(9L, 3L));

        assertEquals(404, error.getStatusCode().value());
    }

    @Test
    void listMarksTheSessionMatchingSid() {
        when(repository.listActive(9L, NOW)).thenReturn(java.util.List.of(
                new ReaderDeviceRepository.DeviceRow(8L, "Máy tính", "DESKTOP", "1.1.1.1", null, null, "sid-a")));

        var rows = service.listMine(9L, "sid-a");

        assertTrue(rows.get(0).current());
        assertEquals(8L, rows.get(0).deviceId());
    }
}
