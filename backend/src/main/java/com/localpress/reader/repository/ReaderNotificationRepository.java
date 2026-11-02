package com.localpress.reader.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

// ghi notifications kênh IN_APP khi có bài xuất bản lần đầu
@Repository
@RequiredArgsConstructor
public class ReaderNotificationRepository {

    private final JdbcTemplate jdbcTemplate;

    public List<Long> findFollowerIds(long categoryId) {
        return jdbcTemplate.query(
                "SELECT user_id FROM category_follows WHERE category_id = ?",
                (rs, row) -> rs.getLong(1),
                categoryId);
    }

    // INSERT IGNORE để khóa unique dedup_key chặn hai lần ghi cùng lúc mà không làm hỏng transaction
    public int insertInApp(long userId, String title, String content, String dedupKey) {
        return jdbcTemplate.update("""
                INSERT IGNORE INTO notifications
                    (user_id, notification_type, channel, title, content, delivery_status, is_read, dedup_key)
                VALUES (?, 'ARTICLE_PUBLISHED', 'IN_APP', ?, ?, 'SENT', FALSE, ?)
                """, userId, title, content, dedupKey);
    }
}
