package com.localpress.reader;

import com.localpress.reader.service.ArticlePublishedNotificationService;
import com.localpress.reader.service.ReaderDeviceSessionService;
import com.localpress.shared.device.DeviceLimitReachedException;
import com.localpress.shared.event.ArticlePublishedEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Chạy sau khi backend đã áp V11. Không bật trong mvn test thường.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("dev")
@EnabledIfSystemProperty(named = "localpress.device.it", matches = "true")
class ReaderDeviceMysqlTest {

    @Autowired
    private ReaderDeviceSessionService sessions;

    @Autowired
    private ArticlePublishedNotificationService notifications;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void registerStopsAtTwoAndNotificationIsUnique() {
        long userId = Long.parseLong(System.getProperty("localpress.device.userId"));
        Instant expiresAt = Instant.now().plusSeconds(3600);

        var first = sessions.register(userId, "Máy tính E2E", "DESKTOP", "127.0.0.1", expiresAt);
        var second = sessions.register(userId, " ", "MOBILE", null, expiresAt);
        assertThrows(DeviceLimitReachedException.class,
                () -> sessions.register(userId, "Máy thứ ba", "TABLET", null, expiresAt));

        assertTrue(sessions.isActive(first.sessionId()));
        assertTrue(sessions.isActive(second.sessionId()));
        Integer active = jdbc.queryForObject("""
                SELECT COUNT(*) FROM user_devices
                WHERE user_id = ? AND revoked_at IS NULL
                """, Integer.class, userId);
        assertEquals(2, active);
        String defaultName = jdbc.queryForObject("""
                SELECT device_name FROM user_devices WHERE device_id = ?
                """, String.class, second.deviceId());
        assertEquals("Trình duyệt", defaultName);

        jdbc.update("""
                INSERT INTO category_follows (user_id, category_id) VALUES (?, 2)
                ON DUPLICATE KEY UPDATE user_id = user_id
                """, userId);
        ArticlePublishedEvent event = ArticlePublishedEvent.builder()
                .eventId("e2e-device")
                .articleId(1L)
                .categoryId(2L)
                .versionNumber(1)
                .title("Bài thông báo E2E")
                .slug("bai-thong-bao-e2e")
                .publishedAt(Instant.now())
                .firstPublication(true)
                .build();
        notifications.record(event);
        notifications.record(event);
        notifications.record(event.toBuilder().firstPublication(false).build());

        Integer notes = jdbc.queryForObject("""
                SELECT COUNT(*) FROM notifications
                WHERE user_id = ? AND dedup_key = ?
                """, Integer.class, userId, "ARTICLE_PUBLISHED:1:" + userId);
        assertEquals(1, notes);

        sessions.revoke(userId, second.deviceId());
        assertFalse(sessions.isActive(second.sessionId()));
    }
}
