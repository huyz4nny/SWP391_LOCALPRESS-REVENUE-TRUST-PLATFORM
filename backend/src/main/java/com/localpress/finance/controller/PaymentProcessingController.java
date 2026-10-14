package com.localpress.finance.controller;

import com.localpress.finance.dto.request.CreateOrderRequest;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ==============================================================================
 * CONTROLLER: BỘ XỬ LÝ THANH TOÁN TỰ ĐỘNG & WEBHOOK SEPAY (SV4 - UC047..UC050)
 * ==============================================================================
 * Phân hệ: com.localpress.finance (SV4 - Huy)
 * Các API cung cấp:
 * 1. POST /api/v1/finance/orders                   : Tạo phiên thanh toán dùng chung cho Reader & Advertiser (UC047)
 * 2. GET  /api/v1/finance/orders/{id}              : Tra cứu trạng thái đơn hàng (UC050)
 * 3. GET  /api/v1/finance/orders/code/{code}/status : Polling trạng thái đơn hàng theo mã đơn (UC050)
 * 4. POST /api/v1/finance/webhook/sepay            : Tiếp nhận Webhook IPN từ SePay xử lý tự động (UC048, UC049)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
public class PaymentProcessingController {

    private final PaymentProcessingService paymentProcessingService;

    /**
     * UC047: Tạo đơn hàng thanh toán tập trung (hỗ trợ cả alias /checkout từ Paywall/Reader).
     * Người dùng (Độc giả hoặc Doanh nghiệp) gọi vào khi bấm "Mua gói", "Mua bài" hoặc "Thanh toán booking".
     */
    @PostMapping({"/orders", "/checkout"})
    public ResponseEntity<ApiResponse<OrderCreateResponse>> createOrder(
            @RequestHeader(value = "X-User-Id", defaultValue = "7") Long userId,
            @Valid @RequestBody CreateOrderRequest request
    ) {
        log.info("API POST /api/v1/finance/orders - User #{}, loại: {}, số tiền: {}",
                userId, request.getOrderType(), request.getAmount());

        OrderCreateResponse response = paymentProcessingService.createOrder(userId, request);
        return ResponseEntity.ok(ApiResponse.ok("Khởi tạo đơn hàng thanh toán thành công", response));
    }

    /**
     * Tiếp nhận xác nhận thanh toán từ CheckoutPage (/finance/orders/{id}/pay).
     */
    @PostMapping("/orders/{id}/pay")
    public ResponseEntity<ApiResponse<OrderStatusResponse>> payOrder(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        log.info("API POST /api/v1/finance/orders/{}/pay - Nhận dữ liệu submit: {}", id, body);
        OrderStatusResponse response = paymentProcessingService.getOrderStatus(id);
        return ResponseEntity.ok(ApiResponse.ok("Ghi nhận yêu cầu thanh toán thành công", response));
    }

    /**
     * UC050: Tra cứu trạng thái đơn hàng theo Transaction ID.
     */
    @GetMapping("/orders/{id}")
    public ResponseEntity<ApiResponse<OrderStatusResponse>> getOrderStatus(@PathVariable Long id) {
        log.info("API GET /api/v1/finance/orders/{} - Kiểm tra trạng thái đơn", id);
        OrderStatusResponse response = paymentProcessingService.getOrderStatus(id);
        return ResponseEntity.ok(ApiResponse.ok("Lấy trạng thái đơn hàng thành công", response));
    }

    /**
     * UC050: Polling trạng thái đơn hàng theo mã đơn `orderCode`.
     * Rất tiện lợi cho trang thanh toán phía Frontend (CheckoutPage) tự động reload khi khách vừa chuyển khoản xong.
     */
    @GetMapping("/orders/code/{orderCode}/status")
    public ResponseEntity<ApiResponse<OrderStatusResponse>> getOrderStatusByCode(@PathVariable String orderCode) {
        log.info("API GET /api/v1/finance/orders/code/{}/status - Polling trạng thái", orderCode);
        OrderStatusResponse response = paymentProcessingService.getOrderStatusByCode(orderCode);
        return ResponseEntity.ok(ApiResponse.ok("Lấy trạng thái đơn hàng thành công", response));
    }

    /**
     * UC048, UC049: Webhook IPN nhận thông báo thanh toán tức thời từ Cổng SePay.
     * Endpoint công khai (được cấu hình permitAll() trong SecurityConfig), xác thực qua X-Secret-Key hoặc payload.
     * Luôn trả về HTTP 200 OK để SePay không gửi lại vô hạn.
     */
    @PostMapping("/webhook/sepay")
    public ResponseEntity<Map<String, Object>> handleSepayWebhook(
            @RequestHeader(value = "X-Secret-Key", required = false) String secretKeyHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody SepayIpnRequest ipnRequest
    ) {
        String auth = secretKeyHeader != null ? secretKeyHeader : authHeader;
        log.info("API POST /api/v1/finance/webhook/sepay - Nhận IPN từ SePay");

        Map<String, Object> result = paymentProcessingService.processSepayIpn(auth, ipnRequest);
        return ResponseEntity.ok(result);
    }
}
