package com.localpress.reader.service;

import com.localpress.reader.dto.ReaderNotificationResponse;
import com.localpress.reader.repository.ReaderNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

// trang Thông báo của độc giả (/account/notifications): UC040 bài mới, UC046 kết quả hoàn tiền
@Service
@RequiredArgsConstructor
public class ReaderNotificationService {

    static final int MAX_ITEMS = 50;

    private final ReaderNotificationRepository repository;

    @Transactional(readOnly = true)
    public List<ReaderNotificationResponse> listMine(Long userId) {
        return repository.findInAppForUser(userId, MAX_ITEMS);
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return repository.countUnread(userId);
    }

    // id không thuộc người đang đăng nhập thì báo 404 như không tồn tại (không lộ thông báo của người khác)
    @Transactional
    public void markRead(Long userId, Long notificationId) {
        if (notificationId == null || notificationId <= 0 || repository.markRead(userId, notificationId) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông báo");
        }
    }

    @Transactional
    public void markAllRead(Long userId) {
        repository.markAllRead(userId);
    }
}
