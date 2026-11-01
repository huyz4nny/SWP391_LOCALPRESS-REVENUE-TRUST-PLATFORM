package com.localpress.reader.controller;

import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.dto.FollowStateResponse;
import com.localpress.reader.dto.FollowedCategoryResponse;
import com.localpress.reader.service.ReaderCurrentUser;
import com.localpress.reader.service.ReaderFollowService;
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

// api theo dõi chuyên mục và feed cá nhân hóa của SV3 phục vụ UC040 ở màn hình II.3.8
// route gốc /api/v1/reader bắt buộc đăng nhập và user luôn lấy từ phiên chứ không nhận userId từ client
// luồng đi là frontend gọi vào đây -> ReaderFollowService -> bảng category_follows và articles
@RestController
@RequestMapping("/api/v1/reader")
@RequiredArgsConstructor
public class ReaderFollowController {

    private static final int MAX_PAGE_SIZE = 50;

    private final ReaderFollowService followService;
    private final ReaderCurrentUser readerCurrentUser;

    // block danh sách chuyên mục đang theo dõi
    @GetMapping("/followed-categories")
    public ResponseEntity<List<FollowedCategoryResponse>> getFollowedCategories() {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(followService.getFollowedCategories(userId));
    }

    // block theo dõi chuyên mục, gọi lại nhiều lần vẫn chỉ có một bản ghi
    @PutMapping("/followed-categories/{categoryId:\\d+}")
    public ResponseEntity<FollowStateResponse> follow(@PathVariable Long categoryId) {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(followService.follow(userId, categoryId));
    }

    // block bỏ theo dõi chuyên mục, chưa theo dõi thì vẫn trả thành công
    @DeleteMapping("/followed-categories/{categoryId:\\d+}")
    public ResponseEntity<FollowStateResponse> unfollow(@PathVariable Long categoryId) {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(followService.unfollow(userId, categoryId));
    }

    // block feed bài mới của các chuyên mục đang theo dõi có phân trang
    @GetMapping("/feed")
    public ResponseEntity<Page<ArticleSummaryResponse>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = readerCurrentUser.requireUserId();
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        return ResponseEntity.ok(followService.getFeed(userId, pageable));
    }
}
