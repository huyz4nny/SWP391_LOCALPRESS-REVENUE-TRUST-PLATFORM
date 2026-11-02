package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleReportResponse;
import com.localpress.reader.repository.ReaderArticleReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

// UC042 gửi báo lỗi nội dung bài, chỉ tạo bản ghi PENDING
// người xử lý là kiểm duyệt nội dung, module này không đổi status
@Service
@RequiredArgsConstructor
public class ReaderArticleReportService {

    static final Set<String> REASONS = Set.of("INCORRECT_INFO", "TYPO", "IMAGE_ERROR", "OTHER");
    static final int MAX_DESCRIPTION = 1000;

    private final ReaderArticleReportRepository repository;

    @Transactional
    public ArticleReportResponse report(Long userId, Long articleId, String reason, String description) {
        if (articleId == null || articleId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài viết không hợp lệ");
        }
        if (reason == null || !REASONS.contains(reason)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lý do không hợp lệ");
        }
        String note = description == null ? "" : description.trim();
        if (note.length() > MAX_DESCRIPTION) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mô tả tối đa 1000 ký tự");
        }
        if (!repository.isPublished(articleId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết đang xuất bản");
        }
        if (repository.hasPending(userId, articleId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã gửi báo cáo cho bài này và đang chờ xử lý");
        }
        Long reportId = repository.insert(userId, articleId, reason, note.isEmpty() ? null : note);
        return new ArticleReportResponse(reportId, "PENDING");
    }
}
