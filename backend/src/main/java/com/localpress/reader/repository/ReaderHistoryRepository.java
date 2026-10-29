package com.localpress.reader.repository;

import com.localpress.reader.dto.ReadingHistoryItemResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

// repository ghi và đọc bảng reading_history của SV3 phục vụ UC039
// luồng đi là ReaderHistoryService gọi vào đây -> chạy sql lên reading_history articles và article_versions
@Repository
@RequiredArgsConstructor
public class ReaderHistoryRepository {

    private final JdbcTemplate jdbcTemplate;

    // block ghi lịch sử: bài đã có thì chỉ cập nhật last_read_at, bài mới thì thêm dòng
    public void upsert(Long userId, Long articleId) {
        jdbcTemplate.update("""
                        INSERT INTO reading_history (user_id, article_id) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE last_read_at = CURRENT_TIMESTAMP
                        """,
                userId, articleId);
    }

    // block xóa một dòng lịch sử, chưa có thì xóa 0 dòng và không coi là lỗi
    public void remove(Long userId, Long articleId) {
        jdbcTemplate.update("DELETE FROM reading_history WHERE user_id = ? AND article_id = ?", userId, articleId);
    }

    // block đếm bài đang xuất bản trong lịch sử để hiện số ở menu tài khoản
    public long countPublished(Long userId) {
        Long count = jdbcTemplate.queryForObject("""
                        SELECT COUNT(*)
                        FROM reading_history h
                        JOIN articles a ON a.article_id = h.article_id
                        WHERE h.user_id = ? AND a.status = 'PUBLISHED'
                        """,
                Long.class, userId);
        return count == null ? 0L : count;
    }

    // block danh sách lịch sử có phân trang, bài mới đọc lên đầu, bài bị gỡ thì ẩn
    public List<ReadingHistoryItemResponse> findPage(Long userId, int limit, int offset) {
        return jdbcTemplate.query("""
                        SELECT a.article_id, v.title, a.slug, a.access_type, c.name AS category_name,
                               c.slug AS category_slug, h.last_read_at
                        FROM reading_history h
                        JOIN articles a ON a.article_id = h.article_id
                        JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number
                        LEFT JOIN categories c ON a.category_id = c.category_id
                        WHERE h.user_id = ? AND a.status = 'PUBLISHED'
                        ORDER BY h.last_read_at DESC, a.article_id DESC
                        LIMIT ? OFFSET ?
                        """,
                (rs, i) -> {
                    Timestamp readAt = rs.getTimestamp("last_read_at");
                    return ReadingHistoryItemResponse.builder()
                            .articleId(rs.getLong("article_id"))
                            .title(rs.getString("title"))
                            .slug(rs.getString("slug"))
                            .isPremium("PREMIUM".equalsIgnoreCase(rs.getString("access_type")))
                            .categoryName(rs.getString("category_name"))
                            .categorySlug(rs.getString("category_slug"))
                            .lastReadAt(readAt != null ? readAt.toLocalDateTime().toString() : null)
                            .build();
                },
                userId, limit, offset);
    }
}
