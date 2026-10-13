package com.localpress.reader.controller;

import com.localpress.reader.dto.ReaderCommentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * UC031 (Iter 1): Guest/Reader xem bình luận ĐÃ DUYỆT của bài viết.
 * Chỉ đọc. Gửi/sửa/báo cáo bình luận thuộc Iter 2 (UC041-UC042).
 * Path nằm trong /api/v1/comments/** đã permitAll ở SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class ReaderCommentController {

    private final JdbcTemplate jdbc;

    @GetMapping("/article/{articleId}")
    public List<ReaderCommentResponse> listApprovedByArticle(@PathVariable Long articleId) {
        return jdbc.query(
                """
                SELECT c.comment_id, c.article_id, c.user_id, u.full_name, u.avatar_url,
                       c.content, c.status, c.created_at
                FROM comments c
                JOIN users u ON u.user_id = c.user_id
                WHERE c.article_id = ? AND c.status = 'APPROVED'
                ORDER BY c.created_at ASC
                """,
                (rs, row) -> ReaderCommentResponse.builder()
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
                        .build(),
                articleId
        );
    }
}
