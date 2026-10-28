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

import java.util.Map;

/**
 * ==============================================================================
 * CONTROLLER: ĐỐI SOÁT TÀI CHÍNH NGÂN HÀNG (SV4 - UC054)
 * ==============================================================================
 * Phân hệ: com.localpress.finance (SV4 - Huy)
 * Màn hình UI: II.4.9 Payment Reconciliation (/backoffice/finance/reconciliation)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance/reconciliation")
@RequiredArgsConstructor
public class FinanceReconciliationController {

    private final FinanceReconciliationService financeReconciliationService;
    private final FinanceCurrentUser currentUser;

    /**
     * UC054: Kỳ đối soát theo tháng (?month=yyyy-MM, mặc định tháng hiện tại).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<ReconciliationPeriodResponse>> getReconciliation(
            @RequestParam(required = false) String month
    ) {
        log.info("API GET /api/v1/finance/reconciliation - Lấy kỳ đối soát {}", month);
        ReconciliationPeriodResponse response = financeReconciliationService.getPeriod(month);
        return ResponseEntity.ok(ApiResponse.ok("Lấy kỳ đối soát thành công", response));
    }

    /**
     * UC054: Kế toán xử lý 1 khoản lệch: gán đơn, cộng ví hoặc giải trình (bắt buộc ghi chú).
     */
    @PostMapping("/resolve")
    public ResponseEntity<ApiResponse<ReconciliationPeriodResponse>> resolveDiscrepancy(
            @Valid @RequestBody ResolveDiscrepancyRequest request
    ) {
        Long accountantId = currentUser.requireFinanceStaff("Chỉ nhân sự tài chính được xử lý khoản lệch").userId();
        log.info("API POST /api/v1/finance/reconciliation/resolve - Khoản lệch {} -> {}",
                request.getDiscrepancyId(), request.getAction());
        ReconciliationPeriodResponse response = financeReconciliationService.resolveDiscrepancy(request, accountantId);
        return ResponseEntity.ok(ApiResponse.ok("Đã xử lý chênh lệch thành công", response));
    }

    /**
     * UC054: Kế toán trưởng chốt kỳ. Body (không bắt buộc):
     * {"month": "2026-10", "acknowledgeUnresolved": true, "note": "..."}.
     * Còn khoản lệch mà chưa xác nhận -> 409.
     */
    @PostMapping("/close")
    public ResponseEntity<ApiResponse<ReconciliationPeriodResponse>> closePeriod(
            @RequestBody(required = false) Map<String, Object> body
    ) {
        Long managerId = currentUser.requireFinanceManager("Chỉ Kế toán trưởng được chốt kỳ đối soát").userId();
        String month = body != null && body.get("month") != null ? body.get("month").toString() : null;
        boolean acknowledge = body != null && Boolean.parseBoolean(String.valueOf(body.get("acknowledgeUnresolved")));
        String note = body != null && body.get("note") != null ? body.get("note").toString() : null;
        log.info("API POST /api/v1/finance/reconciliation/close - Chốt kỳ {} bởi #{}", month, managerId);
        ReconciliationPeriodResponse response = financeReconciliationService.closePeriod(month, managerId, acknowledge, note);
        return ResponseEntity.ok(ApiResponse.ok("Kỳ đối soát đã được đóng thành công", response));
    }
}
