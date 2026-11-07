package com.localpress.reader;

import com.localpress.reader.service.ArticlePublishedNotificationService;
import com.localpress.reader.service.ReaderDeviceSessionService;
import com.localpress.shared.device.DeviceLimitReachedException;
import com.localpress.shared.event.ArticlePublishedEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Schema riêng, không ghi localpress_db. Không bật trong mvn test thường:
// mvn test -Dtest=ReaderDeviceMysqlTest -Dlocalpress.device.it=true
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.datasource.url=jdbc:mysql://localhost:3306/localpress_sv3_device_it?createDatabaseIfNotExist=true&useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true"
)
@ActiveProfiles("dev")
@EnabledIfSystemProperty(named = "localpress.device.it", matches = "true")
class ReaderDeviceMysqlTest {

    private static final String SCHEMA = "localpress_sv3_device_it";

    @Autowired
    private ReaderDeviceSessionService sessions;

    @Autowired
    private ArticlePublishedNotificationService notifications;

    @Autowired
    private JdbcTemplate jdbc;

    private long userId;
    private long categoryId;

    @BeforeEach
    void createFixture() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT DATABASE()", String.class));
        String token = UUID.randomUUID().toString().substring(0, 8);
        jdbc.update("""
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES (?, 'x', 'Doc gia IT', 'READER')
                """, "sv3-device-" + token + "@it.test");
        userId = jdbc.queryForObject(
                "SELECT user_id FROM users WHERE email = ?",
                Long.class,
                "sv3-device-" + token + "@it.test");
        jdbc.update("""
                INSERT INTO categories (name, slug, status)
                VALUES ('Chuyen muc IT', ?, 'ACTIVE')
                """, "sv3-device-" + token);
        categoryId = jdbc.queryForObject(
                "SELECT category_id FROM categories WHERE slug = ?",
                Long.class,
                "sv3-device-" + token);
    }

    @AfterEach
    void deleteFixture() {
        if (userId > 0) {
            jdbc.update("DELETE FROM notifications WHERE user_id = ?", userId);
            jdbc.update("DELETE FROM category_follows WHERE user_id = ?", userId);
            jdbc.update("DELETE FROM user_devices WHERE user_id = ?", userId);
            jdbc.update("DELETE FROM users WHERE user_id = ?", userId);
        }
        if (categoryId > 0) {
            jdbc.update("DELETE FROM categories WHERE category_id = ?", categoryId);
        }
    }

    @Test
    void registerStopsAtTwoAndNotificationIsUnique() {
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
                INSERT INTO category_follows (user_id, category_id) VALUES (?, ?)
                """, userId, categoryId);
        ArticlePublishedEvent event = ArticlePublishedEvent.builder()
                .eventId("e2e-device")
                .articleId(1L)
                .categoryId(categoryId)
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
