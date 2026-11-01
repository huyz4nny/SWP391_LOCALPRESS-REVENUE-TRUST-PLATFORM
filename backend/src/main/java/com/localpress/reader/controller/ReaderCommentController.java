// package controller của reader nhận request http từ frontend
package com.localpress.reader.controller;

import com.localpress.reader.dto.ReaderCommentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// class này là api xem bình luận công khai của bài viết phục vụ UC031 ở màn hình II.3.2 phần cuối bài
// chỉ trả bình luận đã duyệt (rule 12) và route /api/v1/comments đã mở permitAll cho khách
// luồng đi là frontend CommentSection gọi vào đây -> JdbcTemplate query thẳng bảng comments và users -> trả list về frontend
@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class ReaderCommentController {

    // dùng JdbcTemplate viết sql trực tiếp cho gọn vì chỉ cần đọc danh sách
    private final JdbcTemplate jdbc;

    // block lấy danh sách bình luận đã duyệt theo id bài viết
    // join users để lấy tên và avatar người bình luận
    // lọc status APPROVED nên bình luận PENDING REJECTED HIDDEN không bao giờ lọt ra ngoài
    // sắp xếp created_at tăng dần để bình luận cũ nằm trên
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
                // mỗi dòng kết quả được đổi thành một ReaderCommentResponse để trả ra json
                (rs, row) -> ReaderCommentResponse.builder()
                        .id(rs.getLong("comment_id"))
                        .articleId(rs.getLong("article_id"))
                        .userId(rs.getLong("user_id"))
                        .userName(rs.getString("full_name"))
                        .userAvatar(rs.getString("avatar_url"))
                        .content(rs.getString("content"))
                        .status(rs.getString("status"))
                        // nếu created_at null thì để null còn không thì đổi sang chuỗi để frontend hiển thị
                        .createdAt(rs.getTimestamp("created_at") != null
                                ? rs.getTimestamp("created_at").toLocalDateTime().toString()
                                : null)
                        .build(),
                // tham số này gắn vào dấu ? đầu tiên trong câu sql
                articleId
        );
    }
}
