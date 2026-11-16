package com.localpress.reader.controller;

import com.localpress.reader.dto.CommentContentRequest;
import com.localpress.reader.dto.ReaderCommentResponse;
import com.localpress.reader.dto.ReportCommentRequest;
import com.localpress.reader.dto.ReportCommentResponse;
import com.localpress.reader.dto.UpdateCommentRequest;
import com.localpress.reader.service.ReaderCommentService;
import com.localpress.reader.service.ReaderCurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// API bình luận của độc giả (màn hình II.3.2 và II.3.7)
//   - UC031: GET /api/v1/comments/article/{id} công khai cho khách (permitAll), chỉ trả bình luận APPROVED
//   - UC041: gửi, sửa bình luận của mình (sửa xong quay về PENDING, rule 12)
//   - UC042: báo cáo bình luận vi phạm
// các API ghi nằm dưới /api/v1/reader/** nên bắt buộc đăng nhập
// luồng đi: frontend CommentSection -> controller này -> ReaderCommentService -> ReaderCommentRepository
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReaderCommentController {

    private final ReaderCommentService commentService;
    private final ReaderCurrentUser readerCurrentUser;

    @GetMapping("/comments/article/{articleId}")
    public List<ReaderCommentResponse> listApprovedByArticle(@PathVariable Long articleId) {
        return commentService.listApproved(articleId);
    }

    @PostMapping("/reader/comments")
    public ReaderCommentResponse post(@RequestBody CommentContentRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        return commentService.post(userId, request.getArticleId(), request.getContent());
    }

    @PutMapping("/reader/comments/{commentId:\\d+}")
    public ReaderCommentResponse edit(@PathVariable Long commentId, @RequestBody UpdateCommentRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        return commentService.edit(userId, commentId, request.getContent());
    }

    @GetMapping("/reader/comments/mine")
    public List<ReaderCommentResponse> mine(@RequestParam(required = false) Long articleId) {
        Long userId = readerCurrentUser.requireUserId();
        return commentService.mine(userId, articleId);
    }

    @PostMapping("/reader/comments/{commentId:\\d+}/report")
    public ReportCommentResponse report(@PathVariable Long commentId, @RequestBody ReportCommentRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        return commentService.report(userId, commentId, request.getReason());
    }
}
