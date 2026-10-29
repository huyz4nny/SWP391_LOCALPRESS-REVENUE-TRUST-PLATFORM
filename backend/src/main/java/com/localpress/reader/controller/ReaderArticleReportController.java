package com.localpress.reader.controller;

import com.localpress.reader.dto.ArticleReportResponse;
import com.localpress.reader.dto.CreateArticleReportRequest;
import com.localpress.reader.service.ReaderArticleReportService;
import com.localpress.reader.service.ReaderCurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// UC042 độc giả báo lỗi nội dung bài đang xuất bản
@RestController
@RequestMapping("/api/v1/reader/article-reports")
@RequiredArgsConstructor
public class ReaderArticleReportController {

    private final ReaderArticleReportService reportService;
    private final ReaderCurrentUser readerCurrentUser;

    @PostMapping
    public ArticleReportResponse create(@RequestBody CreateArticleReportRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        return reportService.report(userId, request.getArticleId(), request.getReason(), request.getDescription());
    }
}
