package com.localpress.finance.controller;

import com.localpress.finance.dto.request.LedgerFilterRequest;
import com.localpress.finance.dto.response.LedgerSummaryResponse;
import com.localpress.finance.dto.response.TransactionDetailResponse;
import com.localpress.finance.dto.response.TransactionLedgerResponse;
import com.localpress.finance.service.FinanceLedgerService;
import com.localpress.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * ==============================================================================
 * CONTROLLER: SỔ QUỸ & CHỨNG TỪ TÀI CHÍNH (UC047, UC048, UC049)
 * ==============================================================================
 * - Phân hệ: com.localpress.finance (SV4 - Huy)
 * - Màn hình UI: II.4.1 Financial Documents and Ledger
 * - Các API cung cấp:
 *   + GET /api/v1/finance/ledger          : Tra cứu danh sách chứng từ (UC047)
 *   + GET /api/v1/finance/ledger/{id}     : Xem chi tiết chứng từ (UC048)
 *   + GET /api/v1/finance/ledger/summary  : Thống kê số liệu sổ quỹ (UC049)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance/ledger")
@RequiredArgsConstructor
public class FinanceLedgerController {

    private final FinanceLedgerService financeLedgerService;

    /**
     * UC047: Tra cứu danh sách chứng từ và biến động sổ quỹ tài chính.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<TransactionLedgerResponse>>> getLedgerEntries(
            @ModelAttribute LedgerFilterRequest filter
    ) {
        log.info("API GET /api/v1/finance/ledger - Tra cứu sổ quỹ");
        Page<TransactionLedgerResponse> result = financeLedgerService.getLedgerEntries(filter);
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách sổ quỹ thành công", result));
    }

    /**
     * UC048: Tra cứu chi tiết một chứng từ giao dịch.
     */
    @GetMapping("/{transactionId}")
    public ResponseEntity<ApiResponse<TransactionDetailResponse>> getTransactionDetail(
            @PathVariable Long transactionId
    ) {
        log.info("API GET /api/v1/finance/ledger/{} - Xem chi tiết chứng từ", transactionId);
        TransactionDetailResponse result = financeLedgerService.getTransactionDetail(transactionId);
        return ResponseEntity.ok(ApiResponse.ok("Lấy chi tiết chứng từ thành công", result));
    }

    /**
     * UC049: Thống kê tổng quan số liệu tài chính sổ quỹ.
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<LedgerSummaryResponse>> getLedgerSummary() {
        log.info("API GET /api/v1/finance/ledger/summary - Tổng hợp sổ quỹ");
        LedgerSummaryResponse result = financeLedgerService.getLedgerSummary();
        return ResponseEntity.ok(ApiResponse.ok("Lấy tổng quan sổ quỹ thành công", result));
    }
}
