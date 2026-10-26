package com.localpress.reader.controller;

import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.dto.BookmarkStateResponse;
import com.localpress.reader.service.ReaderBookmarkService;
import com.localpress.reader.service.ReaderCurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// api tủ sách của SV3, hiện có phần bài đã lưu phục vụ UC038 ở màn hình II.3.6
// route gốc /api/v1/reader bắt buộc đăng nhập và user luôn lấy từ phiên chứ không nhận userId từ client
// luồng đi là frontend gọi vào đây -> ReaderBookmarkService -> bảng saved_articles
@RestController
@RequestMapping("/api/v1/reader")
@RequiredArgsConstructor
public class ReaderLibraryController {

    private static final int MAX_PAGE_SIZE = 50;

    private final ReaderBookmarkService bookmarkService;
    private final ReaderCurrentUser readerCurrentUser;

    // block danh sách bài đã lưu có phân trang cho trang /account/bookmarks
    @GetMapping("/saved-articles")
    public ResponseEntity<Page<ArticleSummaryResponse>> getSavedArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = readerCurrentUser.requireUserId();
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        return ResponseEntity.ok(bookmarkService.getSavedArticles(userId, pageable));
    }

    // block id các bài đã lưu để tô icon lưu trên thẻ bài và đếm số bài ở menu tài khoản
    @GetMapping("/saved-articles/ids")
    public ResponseEntity<List<Long>> getSavedArticleIds() {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(bookmarkService.getSavedArticleIds(userId));
    }

    // block lưu bài, gọi lại nhiều lần vẫn chỉ có một bản ghi
    @PutMapping("/saved-articles/{articleId:\\d+}")
    public ResponseEntity<BookmarkStateResponse> save(@PathVariable Long articleId) {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(bookmarkService.save(userId, articleId));
    }

    // block bỏ lưu bài, bài chưa lưu thì vẫn trả thành công
    @DeleteMapping("/saved-articles/{articleId:\\d+}")
    public ResponseEntity<BookmarkStateResponse> remove(@PathVariable Long articleId) {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(bookmarkService.remove(userId, articleId));
    }
}
