package com.localpress.finance.controller;

import com.localpress.finance.dto.request.CreateOrderRequest;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.finance.service.SePayService;
import com.localpress.finance.service.SepayGatewayService;
import com.localpress.finance.model.SepayWebhookLog;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import com.localpress.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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
 * 4. GET  /api/v1/finance/orders/code/{code}        : Dữ liệu trang thanh toán chung /payment/:orderCode
 * 5. POST /api/v1/finance/orders/code/{code}/pay-with-wallet : Trả đơn bằng số dư Ví LocalPress
 *    POST /api/v1/finance/orders/code/{code}/shortfall-topup : Ví thiếu -> mã QR nạp bù, tiền về tự trả đơn
 * 6. POST /api/v1/finance/webhook/sepay            : Tiếp nhận Webhook IPN từ SePay xử lý tự động (UC048, UC049)
 * Người dùng luôn lấy từ phiên đăng nhập (FinanceCurrentUser), không tin header do client tự gửi (Rule 14).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
public class PaymentProcessingController {

    private final PaymentProcessingService paymentProcessingService;
    private final SePayService sePayService;
    private final FinanceCurrentUser currentUser;
    private final SepayGatewayService sepayGatewayService;
    private final ObjectMapper objectMapper;

    /**
     * UC047: Tạo đơn hàng thanh toán tập trung (hỗ trợ cả alias /checkout từ Paywall/Reader).
     * Module nguồn gọi khi khách bấm "Mua gói", "Mua bài" hoặc "Thanh toán booking",
     * rồi chuyển khách sang trang thanh toán chung /payment/{orderCode}.
     */
    @PostMapping({"/orders", "/checkout"})
    public ResponseEntity<ApiResponse<OrderCreateResponse>> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        FinanceCurrentUser.Principal principal = currentUser.require();
        log.info("API POST /api/v1/finance/orders - User #{}, loại: {}, số tiền: {}",
                principal.userId(), request.getOrderType(), request.getAmount());

        OrderCreateResponse response = paymentProcessingService.createOrder(principal.userId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Khởi tạo đơn hàng thanh toán thành công", response));
    }

    /**
     * Dữ liệu cho trang thanh toán chung: tóm tắt đơn, QR SePay, thông tin chuyển khoản, hạn QR.
     */
    @GetMapping("/orders/code/{orderCode}")
    public ResponseEntity<ApiResponse<OrderCreateResponse>> getPaymentView(@PathVariable String orderCode) {
        OrderCreateResponse response = paymentProcessingService.getPaymentView(currentUser.require(), orderCode);
        return ResponseEntity.ok(ApiResponse.ok("Lấy thông tin thanh toán thành công", response));
    }

    /**
     * Trả đơn bằng số dư Ví LocalPress.
     */
    @PostMapping("/orders/code/{orderCode}/pay-with-wallet")
    public ResponseEntity<ApiResponse<OrderStatusResponse>> payWithWallet(@PathVariable String orderCode) {
        OrderStatusResponse response = paymentProcessingService.payWithWallet(currentUser.require(), orderCode);
        return ResponseEntity.ok(ApiResponse.ok("Thanh toán bằng ví thành công", response));
    }

    /**
     * UC050: Tra cứu trạng thái đơn hàng theo Transaction ID.
     */
    /**
     * Ví không đủ tiền trả đơn: tạo (hoặc dùng lại) mã nạp bù đúng phần còn thiếu.
     * Tiền nạp về thì hệ thống tự trừ ví trả đơn {orderCode}. Mọi thanh toán đơn đều đi qua ví.
     */
    @PostMapping("/orders/code/{orderCode}/shortfall-topup")
    public ResponseEntity<ApiResponse<OrderCreateResponse>> createShortfallTopUp(@PathVariable String orderCode) {
        OrderCreateResponse response = paymentProcessingService.createShortfallTopUp(currentUser.require(), orderCode);
        return ResponseEntity.ok(ApiResponse.ok("Đã tạo mã nạp bù " + response.getAmount().toPlainString() + " VND", response));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<ApiResponse<OrderStatusResponse>> getOrderStatus(@PathVariable Long id) {
        OrderStatusResponse response = paymentProcessingService.getOrderStatus(currentUser.require(), id);
        return ResponseEntity.ok(ApiResponse.ok("Lấy trạng thái đơn hàng thành công", response));
    }

    /**
     * UC050: Polling trạng thái đơn hàng theo mã đơn, trang thanh toán gọi 3 giây/lần.
     */
    @GetMapping("/orders/code/{orderCode}/status")
    public ResponseEntity<ApiResponse<OrderStatusResponse>> getOrderStatusByCode(@PathVariable String orderCode) {
        OrderStatusResponse response = paymentProcessingService.getOrderStatusByCode(currentUser.require(), orderCode);
        return ResponseEntity.ok(ApiResponse.ok("Lấy trạng thái đơn hàng thành công", response));
    }

    /**
     * UC048, UC049: Webhook IPN từ SePay. Endpoint công khai (permitAll trong SecurityConfig),
     * bắt buộc header "Authorization: Apikey <webhook-api-key>". Sai khóa trả 401 và không xử lý gì.
     * Nhận body thô để ghi nguyên payload vào sepay_webhook_logs (kể cả payload sai định dạng).
     * Đã xử lý xong thì luôn trả 200 + {"success": true}, nếu không SePay sẽ gửi lại tối đa 7 lần.
     */
    @PostMapping("/webhook/sepay")
    public ResponseEntity<Map<String, Object>> handleSepayWebhook(
            @RequestHeader(value = "X-Secret-Key", required = false) String secretKeyHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) String rawBody,
            HttpServletRequest request
    ) {
        String auth = secretKeyHeader != null ? secretKeyHeader : authHeader;
        boolean authOk = sePayService.verifyIpnSecretKey(auth);
        SepayIpnRequest ipn = null;
        try {
            ipn = rawBody == null || rawBody.isBlank() ? null : objectMapper.readValue(rawBody, SepayIpnRequest.class);
        } catch (Exception e) {
            log.warn("Webhook SePay sai định dạng JSON: {}", e.getMessage());
        }
        if (!authOk) {
            log.warn("AUDIT: Webhook SePay bị từ chối do sai khóa xác thực, IP {}", clientIp(request));
        }
        SepayGatewayService.Outcome outcome = sepayGatewayService.receive(
                SepayWebhookLog.Source.WEBHOOK, ipn, rawBody, authOk && ipn != null, clientIp(request));
        return ResponseEntity.status(outcome.httpStatus()).body(outcome.body());
    }

    /** Qua tunnel (cloudflared/ngrok) thì IP thật nằm ở X-Forwarded-For. */
    private static String clientIp(HttpServletRequest request) {
        String fwd = request.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) return fwd.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
