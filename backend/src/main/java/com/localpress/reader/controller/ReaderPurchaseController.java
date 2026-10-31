package com.localpress.reader.controller;

import com.localpress.reader.dto.CreateArticlePurchaseRequest;
import com.localpress.reader.dto.CreateSubscriptionRequest;
import com.localpress.reader.dto.PendingOrderTargetResponse;
import com.localpress.reader.service.ReaderCurrentUser;
import com.localpress.reader.service.ReaderPurchaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// api mua lẻ bài và đăng ký gói của SV3 phục vụ UC034 và UC035 ở màn hình II.3.3
// route gốc /api/v1/reader không nằm trong danh sách permitAll của SecurityConfig nên bắt buộc phải đăng nhập
// luồng đi là frontend gọi vào đây, server tạo/tái dùng đơn SV4 rồi trả orderCode để mở /payment/:orderCode
@RestController
@RequestMapping("/api/v1/reader")
@RequiredArgsConstructor
public class ReaderPurchaseController {

    private final ReaderPurchaseService readerPurchaseService;
    private final ReaderCurrentUser readerCurrentUser;

    // block tạo bản ghi mua lẻ chờ thanh toán cho một bài premium
    // luồng đi là lấy user từ phiên đăng nhập (không nhận userId từ client) -> service kiểm tra và tạo PENDING -> trả purchase_id và giá
    @PostMapping("/article-purchases")
    public ResponseEntity<PendingOrderTargetResponse> createArticlePurchase(
            @Valid @RequestBody CreateArticlePurchaseRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(readerPurchaseService.createArticlePurchase(userId, request.getArticleId()));
    }

    // block tạo bản ghi gói cước chờ thanh toán
    // luồng đi giống hàm trên nhưng trả subscription_id và giá của gói
    @PostMapping("/subscriptions")
    public ResponseEntity<PendingOrderTargetResponse> createSubscription(
            @Valid @RequestBody CreateSubscriptionRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        return ResponseEntity.ok(readerPurchaseService.createSubscription(userId, request.getPlanId()));
    }
}
