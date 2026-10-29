package com.localpress.reader.controller;

import com.localpress.reader.dto.CommentContentRequest;
import com.localpress.reader.dto.ReaderCommentResponse;
import com.localpress.reader.dto.ReportCommentRequest;
import com.localpress.reader.dto.ReportCommentResponse;
import com.localpress.reader.dto.UpdateCommentRequest;
import com.localpress.reader.service.ReaderCommentWriteService;
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

// gửi, sửa và báo cáo bình luận của độc giả đã đăng nhập
// danh sách công khai vẫn ở GET /api/v1/comments/article/{id} và chỉ trả APPROVED
@RestController
@RequestMapping("/api/v1/reader/comments")
@RequiredArgsConstructor
public class ReaderCommentWriteController {

    private final ReaderCommentWriteService commentWriteService;
    private final ReaderCurrentUser readerCurrentUser;

    @PostMapping
    public ReaderCommentResponse post(@RequestBody CommentContentRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        return commentWriteService.post(userId, request.getArticleId(), request.getContent());
    }

    @PutMapping("/{commentId:\\d+}")
    public ReaderCommentResponse edit(@PathVariable Long commentId, @RequestBody UpdateCommentRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        return commentWriteService.edit(userId, commentId, request.getContent());
    }

    @GetMapping("/mine")
    public List<ReaderCommentResponse> mine(@RequestParam(required = false) Long articleId) {
        Long userId = readerCurrentUser.requireUserId();
        return commentWriteService.mine(userId, articleId);
    }

    @PostMapping("/{commentId:\\d+}/report")
    public ReportCommentResponse report(@PathVariable Long commentId, @RequestBody ReportCommentRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        return commentWriteService.report(userId, commentId, request.getReason());
    }
}
