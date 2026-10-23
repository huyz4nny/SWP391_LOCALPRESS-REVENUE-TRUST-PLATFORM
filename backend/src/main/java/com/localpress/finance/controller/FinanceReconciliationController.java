package com.localpress.finance.controller;

import com.localpress.finance.dto.request.ResolveDiscrepancyRequest;
import com.localpress.finance.dto.response.ReconciliationPeriodResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.FinanceReconciliationService;
import com.localpress.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * ==============================================================================
 * CONTROLLER: ĐỐI SOÁT TÀI CHÍNH NGÂN HÀNG (SV4 - UC054)
 * ==============================================================================
 * Phân hệ: com.localpress.finance (SV4 - Huy)
 * Màn hình UI: II.4.6 Payment Reconciliation (/backoffice/finance/reconciliation)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance/reconciliation")
@RequiredArgsConstructor
public class FinanceReconciliationController {

    private final FinanceReconciliationService financeReconciliationService;
    private final FinanceCurrentUser currentUser;

    /**
     * UC054: Lấy báo cáo kỳ đối soát ngân hàng hiện tại.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<ReconciliationPeriodResponse>> getReconciliation() {
        log.info("API GET /api/v1/finance/reconciliation - Lấy kỳ đối soát");
        ReconciliationPeriodResponse response = financeReconciliationService.getCurrentPeriod();
        return ResponseEntity.ok(ApiResponse.ok("Lấy kỳ đối soát thành công", response));
    }

    /**
     * UC054: Xử lý giải quyết một khoản sai lệch trong kỳ đối soát.
     */
    @PostMapping("/resolve")
    public ResponseEntity<ApiResponse<ReconciliationPeriodResponse>> resolveDiscrepancy(
            @Valid @RequestBody ResolveDiscrepancyRequest request
    ) {
        Long accountantId = currentUser.require().userId();
        log.info("API POST /api/v1/finance/reconciliation/resolve - Giải quyết sai lệch {}", request.getDiscrepancyId());
        ReconciliationPeriodResponse response = financeReconciliationService.resolveDiscrepancy(request, accountantId);
        return ResponseEntity.ok(ApiResponse.ok("Đã xử lý chênh lệch thành công", response));
    }

    /**
     * UC054: Khóa chốt kỳ đối soát tài chính tháng.
     */
    @PostMapping("/close")
    public ResponseEntity<ApiResponse<ReconciliationPeriodResponse>> closePeriod() {
        Long managerId = currentUser.require().userId();
        log.info("API POST /api/v1/finance/reconciliation/close - Đóng kỳ đối soát");
        ReconciliationPeriodResponse response = financeReconciliationService.closePeriod(managerId);
        return ResponseEntity.ok(ApiResponse.ok("Kỳ đối soát đã được đóng thành công", response));
    }
}
