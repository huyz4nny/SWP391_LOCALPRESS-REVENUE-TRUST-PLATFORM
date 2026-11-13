package com.localpress.reader.controller;

import com.localpress.reader.dto.ReaderNotificationResponse;
import com.localpress.reader.service.ReaderCurrentUser;
import com.localpress.reader.service.ReaderNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

// thông báo trong app của độc giả đang đăng nhập (UC040 bài mới trong chuyên mục theo dõi, UC046 kết quả hoàn tiền)
// /api/v1/reader/** bắt buộc đăng nhập (SecurityConfig), mỗi người chỉ thấy và sửa thông báo của mình
@RestController
@RequestMapping("/api/v1/reader/notifications")
@RequiredArgsConstructor
public class ReaderNotificationController {

    private final ReaderNotificationService notificationService;
    private final ReaderCurrentUser readerCurrentUser;

    @GetMapping
    public List<ReaderNotificationResponse> listMine() {
        return notificationService.listMine(readerCurrentUser.requireUserId());
    }

    // số chưa đọc cho chấm đỏ trên menu tài khoản
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", notificationService.countUnread(readerCurrentUser.requireUserId()));
    }

    @PutMapping("/{notificationId:\\d+}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long notificationId) {
        notificationService.markRead(readerCurrentUser.requireUserId(), notificationId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        notificationService.markAllRead(readerCurrentUser.requireUserId());
        return ResponseEntity.noContent().build();
    }
}
