package com.localpress.reader.repository;

import com.localpress.reader.dto.ReaderCommentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

// đọc và ghi bảng comments cho UC041 và UC042
// không sửa moderated_by vì cột đó thuộc tòa soạn khi duyệt
@Repository
@RequiredArgsConstructor
public class ReaderCommentRepository {

    private static final String COMMENT_SELECT = """
            SELECT c.comment_id, c.article_id, c.user_id, u.full_name, u.avatar_url,
                   c.content, c.status, c.created_at
            FROM comments c
            JOIN users u ON u.user_id = c.user_id
            """;

    private final JdbcTemplate jdbcTemplate;

    public record CommentHead(Long commentId, Long articleId, Long userId, String status) {
    }

    public boolean isPublishedArticle(Long articleId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM articles WHERE article_id = ? AND status = 'PUBLISHED'",
                Integer.class,
                articleId);
        return count != null && count > 0;
    }

    public Optional<CommentHead> findHead(Long commentId) {
        List<CommentHead> rows = jdbcTemplate.query(
                "SELECT comment_id, article_id, user_id, status FROM comments WHERE comment_id = ?",
                (rs, row) -> new CommentHead(
                        rs.getLong("comment_id"),
                        rs.getLong("article_id"),
                        rs.getLong("user_id"),
                        rs.getString("status")),
                commentId);
        return rows.stream().findFirst();
    }

    public Long insertPending(Long userId, Long articleId, String content) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO comments (article_id, user_id, content, status) VALUES (?, ?, ?, 'PENDING')",
                    Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, articleId);
            statement.setLong(2, userId);
            statement.setString(3, content);
            return statement;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Không lấy được mã bình luận vừa tạo");
        }
        return key.longValue();
    }

    // sửa nội dung và đưa về PENDING, không đụng moderated_by
    public int updateOwnContentToPending(Long commentId, Long userId, String content) {
        return jdbcTemplate.update("""
                UPDATE comments
                SET content = ?, status = 'PENDING'
                WHERE comment_id = ? AND user_id = ?
                """, content, commentId, userId);
    }

    // chỉ comment đang hiện mới bị kéo về hàng chờ
    public int markApprovedAsPending(Long commentId) {
        return jdbcTemplate.update("""
                UPDATE comments
                SET status = 'PENDING'
                WHERE comment_id = ? AND status = 'APPROVED'
                """, commentId);
    }

    public void insertReportAudit(Long userId, Long commentId, String oldValue, String newValue) {
        jdbcTemplate.update("""
                INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, new_value)
                VALUES (?, 'REPORT_COMMENT', 'comments', ?, ?, ?)
                """, userId, commentId, oldValue, newValue);
    }

    public Optional<ReaderCommentResponse> findResponse(Long commentId) {
        List<ReaderCommentResponse> rows = jdbcTemplate.query(
                COMMENT_SELECT + " WHERE c.comment_id = ?",
                (rs, row) -> mapComment(rs),
                commentId);
        return rows.stream().findFirst();
    }

    public List<ReaderCommentResponse> findMine(Long userId, Long articleId) {
        return jdbcTemplate.query(
                COMMENT_SELECT + " WHERE c.user_id = ? AND c.article_id = ? ORDER BY c.created_at ASC",
                (rs, row) -> mapComment(rs),
                userId,
                articleId);
    }

    private ReaderCommentResponse mapComment(ResultSet rs) throws SQLException {
        return ReaderCommentResponse.builder()
                .id(rs.getLong("comment_id"))
                .articleId(rs.getLong("article_id"))
                .userId(rs.getLong("user_id"))
                .userName(rs.getString("full_name"))
                .userAvatar(rs.getString("avatar_url"))
                .content(rs.getString("content"))
                .status(rs.getString("status"))
                .createdAt(rs.getTimestamp("created_at") != null
                        ? rs.getTimestamp("created_at").toLocalDateTime().toString()
                        : null)
                .build();
    }
}
