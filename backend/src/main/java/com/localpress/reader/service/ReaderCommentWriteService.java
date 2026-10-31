package com.localpress.reader.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.reader.dto.ReaderCommentResponse;
import com.localpress.reader.dto.ReportCommentResponse;
import com.localpress.reader.repository.ReaderCommentRepository;
import com.localpress.reader.repository.ReaderCommentRepository.CommentHead;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// UC041 gửi và sửa bình luận, UC042 báo cáo bình luận đang hiển thị
// status luôn về PENDING, moderated_by để nguyên cho tòa soạn
@Service
@RequiredArgsConstructor
public class ReaderCommentWriteService {

    static final int MAX_CONTENT = 1000;
    static final int MAX_REASON = 500;

    private final ReaderCommentRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ReaderCommentResponse post(Long userId, Long articleId, String content) {
        if (articleId == null || articleId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu mã bài viết");
        }
        String text = requireText(content, MAX_CONTENT, "Nội dung bình luận không được để trống", "Bình luận tối đa 1000 ký tự");
        if (!repository.isPublishedArticle(articleId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết đang phát hành");
        }
        Long commentId = repository.insertPending(userId, articleId, text);
        return repository.findResponse(commentId)
                .orElseThrow(() -> new IllegalStateException("Không đọc lại được bình luận vừa tạo"));
    }

    @Transactional
    public ReaderCommentResponse edit(Long userId, Long commentId, String content) {
        String text = requireText(content, MAX_CONTENT, "Nội dung bình luận không được để trống", "Bình luận tối đa 1000 ký tự");
        CommentHead head = requireHead(commentId);
        if (!head.userId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ sửa được bình luận của chính mình");
        }
        int updated = repository.updateOwnContentToPending(commentId, userId, text);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bình luận");
        }
        return repository.findResponse(commentId)
                .orElseThrow(() -> new IllegalStateException("Không đọc lại được bình luận vừa sửa"));
    }

    @Transactional(readOnly = true)
    public List<ReaderCommentResponse> mine(Long userId, Long articleId) {
        if (articleId == null || articleId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu mã bài viết");
        }
        return repository.findMine(userId, articleId);
    }

    @Transactional
    public ReportCommentResponse report(Long userId, Long commentId, String reason) {
        String text = requireText(reason, MAX_REASON, "Cần ghi lý do báo cáo", "Lý do báo cáo tối đa 500 ký tự");
        CommentHead head = requireHead(commentId);
        if (head.userId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không báo cáo bình luận của chính mình");
        }
        if (!"APPROVED".equals(head.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ báo cáo được bình luận đang hiển thị");
        }
        int updated = repository.markApprovedAsPending(commentId);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ báo cáo được bình luận đang hiển thị");
        }
        repository.insertReportAudit(userId, commentId, json(Map.of("status", "APPROVED")), json(reportBody(text)));
        return new ReportCommentResponse(commentId, "PENDING");
    }

    private Map<String, String> reportBody(String reason) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", "PENDING");
        body.put("reason", reason);
        return body;
    }

    private CommentHead requireHead(Long commentId) {
        if (commentId == null || commentId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã bình luận không hợp lệ");
        }
        return repository.findHead(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bình luận"));
    }

    private String requireText(String raw, int max, String emptyMessage, String longMessage) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, emptyMessage);
        }
        String text = raw.trim();
        if (text.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, longMessage);
        }
        return text;
    }

    private String json(Map<String, String> body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Không ghi được nhật ký báo cáo", exception);
        }
    }
}
