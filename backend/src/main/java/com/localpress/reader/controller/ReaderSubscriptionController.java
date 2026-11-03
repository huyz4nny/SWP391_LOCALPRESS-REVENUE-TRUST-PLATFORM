package com.localpress.reader.controller;

import com.localpress.reader.dto.ReaderSubscriptionResponse;
import com.localpress.reader.service.ReaderCurrentUser;
import com.localpress.reader.service.ReaderSubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// UC044 gói hội viên của độc giả đang đăng nhập
// user lấy từ phiên, không nhận userId trên URL
@RestController
@RequestMapping("/api/v1/reader")
@RequiredArgsConstructor
public class ReaderSubscriptionController {

    private final ReaderSubscriptionService subscriptionService;
    private final ReaderCurrentUser readerCurrentUser;

    @GetMapping("/subscriptions/me")
    public ResponseEntity<List<ReaderSubscriptionResponse>> listMine() {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(subscriptionService.listMine(userId));
    }

    @PostMapping("/subscriptions/{subscriptionId:\\d+}/cancel-auto-renew")
    public ResponseEntity<ReaderSubscriptionResponse> cancelAutoRenew(@PathVariable Long subscriptionId) {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(subscriptionService.cancelAutoRenew(userId, subscriptionId));
    }
}
