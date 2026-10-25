package com.localpress.finance.controller;

import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.model.SepayWebhookLog;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.finance.service.SepayGatewayService;
import com.localpress.shared.exception.AppException;
import com.localpress.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ==============================================================================
 * CONTROLLER: NHẬT KÝ & ĐỒNG BỘ SEPAY (SV4 - UC048, UC049, UC050)
 * ==============================================================================
 * Kế toán: GET  /api/v1/finance/sepay/logs?source=WEBHOOK&limit=100   xem nhật ký tiền SePay báo về
 *          GET  /api/v1/finance/sepay/status                         cấu hình webhook / API token
 *          POST /api/v1/finance/sepay/sync?hours=24                  kéo giao dịch từ API SePay
 * Khách:   POST /api/v1/finance/orders/code/{code}/check-sepay        nút "Tôi đã chuyển khoản, kiểm tra lại"
 * /sepay/** rơi vào quy tắc finance staff của SecurityConfig; kiểm tra lại vai trò ở đây.
 */
@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
public class SepayGatewayController {

    private final SepayGatewayService sepayGatewayService;
    private final PaymentProcessingService paymentProcessingService;
    private final FinanceCurrentUser currentUser;

    @GetMapping("/sepay/logs")
    public ResponseEntity<ApiResponse<List<SepayWebhookLog>>> logs(
            @RequestParam(required = false) SepayWebhookLog.Source source,
            @RequestParam(defaultValue = "100") int limit
    ) {
        requireFinanceStaff();
        return ResponseEntity.ok(ApiResponse.ok("Nhật ký SePay", sepayGatewayService.recentLogs(source, limit)));
    }

    @GetMapping("/sepay/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> status() {
        requireFinanceStaff();
        return ResponseEntity.ok(ApiResponse.ok("Cấu hình SePay", sepayGatewayService.configStatus()));
    }

    @PostMapping("/sepay/sync")
    public ResponseEntity<ApiResponse<SepayGatewayService.SyncResult>> sync(@RequestParam(defaultValue = "24") int hours) {
        requireFinanceStaff();
        SepayGatewayService.SyncResult result = sepayGatewayService.syncFromSepay(hours, null);
        return ResponseEntity.ok(ApiResponse.ok("Đã đồng bộ " + result.processed() + " giao dịch mới từ SePay", result));
    }

    /**
     * Khách bấm "Tôi đã chuyển khoản, kiểm tra lại": hỏi thẳng API SePay cho đúng đơn này rồi trả trạng thái mới.
     * Quyền chỉ được cấp khi SePay có giao dịch thật khớp mã đơn (Rule 4), không dựa vào trình duyệt.
     */
    @PostMapping("/orders/code/{orderCode}/check-sepay")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkOrder(@PathVariable String orderCode) {
        FinanceCurrentUser.Principal principal = currentUser.require();
        // Kiểm tra chủ đơn (403 nếu không phải) trước khi hỏi SePay
        paymentProcessingService.getOrderStatusByCode(principal, orderCode);
        Map<String, Object> check = sepayGatewayService.checkOrderWithSepay(orderCode);
        OrderStatusResponse status = paymentProcessingService.getOrderStatusByCode(principal, orderCode);
        Map<String, Object> body = new LinkedHashMap<>(check);
        body.put("order", status);
        return ResponseEntity.ok(ApiResponse.ok("Đã kiểm tra với SePay", body));
    }

    private void requireFinanceStaff() {
        if (!currentUser.require().isFinanceStaff()) {
            throw new AppException("Chỉ kế toán mới xem được nhật ký SePay", HttpStatus.FORBIDDEN);
        }
    }
}
