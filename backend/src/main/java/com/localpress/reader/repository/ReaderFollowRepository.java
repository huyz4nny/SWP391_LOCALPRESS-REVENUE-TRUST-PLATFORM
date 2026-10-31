package com.localpress.reader.repository;

import com.localpress.reader.dto.FollowedCategoryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

// repository ghi và đọc bảng category_follows của SV3 phục vụ UC040 theo dõi chuyên mục
// luồng đi là ReaderFollowService gọi vào đây -> chạy sql lên category_follows categories và articles
// chỉ đọc bảng categories của SV5 chứ không ghi
@Repository
@RequiredArgsConstructor
public class ReaderFollowRepository {

    private final JdbcTemplate jdbcTemplate;

    // block kiểm tra chuyên mục có tồn tại và đang ACTIVE không, chuyên mục ngừng hoạt động thì không cho theo dõi
    public boolean isActiveCategory(Long categoryId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM categories WHERE category_id = ? AND status = 'ACTIVE'",
                Integer.class, categoryId);
        return count != null && count > 0;
    }

    // block theo dõi chuyên mục, khóa chính (user_id, category_id) chặn theo dõi trùng
    // bấm theo dõi lại thì không lỗi và giữ nguyên followed_at cũ
    public void follow(Long userId, Long categoryId) {
        jdbcTemplate.update("""
                        INSERT INTO category_follows (user_id, category_id) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE user_id = user_id
                        """,
                userId, categoryId);
    }

    // block bỏ theo dõi, chưa theo dõi thì xóa 0 dòng và không coi là lỗi
    public void unfollow(Long userId, Long categoryId) {
        jdbcTemplate.update("DELETE FROM category_follows WHERE user_id = ? AND category_id = ?", userId, categoryId);
    }

    // block lấy các chuyên mục đang theo dõi còn ACTIVE kèm số bài đã xuất bản trong từng chuyên mục
    // chuyên mục bị SV5 tắt thì ẩn khỏi danh sách nhưng bản ghi theo dõi vẫn giữ
    public List<FollowedCategoryResponse> findFollowedCategories(Long userId) {
        return jdbcTemplate.query("""
                        SELECT c.category_id, c.name, c.slug, c.description, f.followed_at,
                               (SELECT COUNT(*) FROM articles a
                                WHERE a.category_id = c.category_id AND a.status = 'PUBLISHED') AS article_count
                        FROM category_follows f
                        JOIN categories c ON c.category_id = f.category_id AND c.status = 'ACTIVE'
                        WHERE f.user_id = ?
                        ORDER BY f.followed_at DESC, c.category_id DESC
                        """,
                (rs, i) -> {
                    Timestamp followedAt = rs.getTimestamp("followed_at");
                    return FollowedCategoryResponse.builder()
                            .id(rs.getLong("category_id"))
                            .name(rs.getString("name"))
                            .slug(rs.getString("slug"))
                            .description(rs.getString("description"))
                            .articleCount(rs.getLong("article_count"))
                            .followedAt(followedAt != null ? followedAt.toLocalDateTime().toString() : null)
                            .build();
                },
                userId);
    }
}
