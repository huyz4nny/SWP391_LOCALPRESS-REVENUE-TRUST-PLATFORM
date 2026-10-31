package com.localpress.reader.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

// repository ghi và đọc bảng saved_articles của SV3 phục vụ UC038 lưu bài
// luồng đi là ReaderBookmarkService gọi vào đây -> chạy sql lên saved_articles và articles
// danh sách bài đầy đủ để hiển thị nằm ở ReaderArticleRepository.findSavedArticles cho cùng cách map với trang chủ
@Repository
@RequiredArgsConstructor
public class ReaderBookmarkRepository {

    private final JdbcTemplate jdbcTemplate;

    // block kiểm tra bài có tồn tại và đang xuất bản không, chỉ bài đang xuất bản mới cho lưu
    public boolean isPublishedArticle(Long articleId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM articles WHERE article_id = ? AND status = 'PUBLISHED'",
                Integer.class, articleId);
        return count != null && count > 0;
    }

    // block lưu bài, khóa chính (user_id, article_id) chặn lưu trùng
    // lưu lại bài đã lưu thì không lỗi và giữ nguyên saved_at cũ nhờ ON DUPLICATE KEY
    public void save(Long userId, Long articleId) {
        jdbcTemplate.update("""
                        INSERT INTO saved_articles (user_id, article_id) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE user_id = user_id
                        """,
                userId, articleId);
    }

    // block bỏ lưu, bài chưa lưu thì xóa 0 dòng và không coi là lỗi
    public void remove(Long userId, Long articleId) {
        jdbcTemplate.update("DELETE FROM saved_articles WHERE user_id = ? AND article_id = ?", userId, articleId);
    }

    // block lấy id các bài đã lưu còn đang xuất bản để frontend tô icon lưu trên thẻ bài và đếm số bài
    public List<Long> findSavedArticleIds(Long userId) {
        return jdbcTemplate.queryForList("""
                        SELECT s.article_id
                        FROM saved_articles s
                        JOIN articles a ON a.article_id = s.article_id
                        WHERE s.user_id = ? AND a.status = 'PUBLISHED'
                        ORDER BY s.saved_at DESC, s.article_id DESC
                        """,
                Long.class, userId);
    }
}
