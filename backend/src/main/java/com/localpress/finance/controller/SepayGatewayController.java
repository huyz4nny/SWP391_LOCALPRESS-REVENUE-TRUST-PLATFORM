package com.localpress.finance.controller;

import com.localpress.finance.model.SepayWebhookLog;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.SepayGatewayService;
import com.localpress.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * ==============================================================================
 * CONTROLLER: NHẬT KÝ SEPAY (SV4 - UC048, UC049)
 * ==============================================================================
 * Kế toán: GET /api/v1/finance/sepay/logs?source=WEBHOOK&from=2026-11-01&to=2026-11-30&page=0&size=50
 * xem nhật ký tiền SePay báo về (phân trang, mới nhất trước)
 * GET /api/v1/finance/sepay/status cấu hình webhook
 * Tiền chỉ vào qua webhook (POST /api/v1/finance/webhook/sepay), không còn hỏi API SePay.
 * /sepay/** rơi vào quy tắc finance staff của SecurityConfig; kiểm tra lại vai
 * trò ở đây.
 */
@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
public class SepayGatewayController {

    private final SepayGatewayService sepayGatewayService;
    private final FinanceCurrentUser currentUser;

    @GetMapping("/sepay/logs")
    public ResponseEntity<ApiResponse<SepayGatewayService.LogPage>> logs(
            @RequestParam(required = false) SepayWebhookLog.Source source,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        requireFinanceStaff(); // phải chuẩn role
        return ResponseEntity.ok(ApiResponse.ok("Nhật ký SePay",
                sepayGatewayService.searchLogs(source, from, to, page, size))); // đọc bảng mới nhất trước
    }

    @GetMapping("/sepay/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> status() {
        requireFinanceStaff(); // phải chuẩn role
        return ResponseEntity.ok(ApiResponse.ok("Cấu hình SePay", sepayGatewayService.configStatus()));
    }

    private void requireFinanceStaff() {
        currentUser.requireFinanceStaff("Chỉ kế toán mới xem được nhật ký SePay");
    }
}
