package com.localpress.reader.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;

@Repository
@RequiredArgsConstructor
public class ReaderArticleReportRepository {

    private final JdbcTemplate jdbcTemplate;

    public boolean isPublished(Long articleId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM articles WHERE article_id = ? AND status = 'PUBLISHED'",
                Integer.class,
                articleId);
        return count != null && count > 0;
    }

    public boolean hasPending(Long userId, Long articleId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM article_reports
                WHERE user_id = ? AND article_id = ? AND status = 'PENDING'
                """, Integer.class, userId, articleId);
        return count != null && count > 0;
    }

    public Long insert(Long userId, Long articleId, String reason, String description) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO article_reports (article_id, user_id, reason, description, status)
                    VALUES (?, ?, ?, ?, 'PENDING')
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, articleId);
            ps.setLong(2, userId);
            ps.setString(3, reason);
            ps.setString(4, description);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Không lấy được id báo cáo vừa tạo");
        }
        return key.longValue();
    }
}
