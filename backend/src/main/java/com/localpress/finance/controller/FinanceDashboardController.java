package com.localpress.finance.controller;

import com.localpress.finance.dto.response.FinanceDashboardResponse;
import com.localpress.finance.service.FinanceLedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ==============================================================================
 * CONTROLLER: TỔNG QUAN TÀI CHÍNH (FINANCE DASHBOARD - SV4)
 * ==============================================================================
 * Cung cấp API trực tiếp cho màn hình Tổng quan tài chính: FinanceDashboard.tsx
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance/dashboard")
@RequiredArgsConstructor
public class FinanceDashboardController {

    private final FinanceLedgerService financeLedgerService;

    /**
     * Lấy các chỉ số KPI doanh thu, số lượng đơn và giao dịch mới nhất từ CSDL.
     */
    @GetMapping
    public ResponseEntity<FinanceDashboardResponse> getDashboard() {
        log.info("API GET /api/v1/finance/dashboard - Lấy dữ liệu tổng quan");
        FinanceDashboardResponse response = financeLedgerService.getFinanceDashboard();
        return ResponseEntity.ok(response);
    }
}
