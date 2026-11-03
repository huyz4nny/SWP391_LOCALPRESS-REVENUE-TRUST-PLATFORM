package com.localpress.finance.controller;

import com.localpress.finance.dto.response.FinancialDocumentResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.FinancialDocumentService;
import com.localpress.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ==============================================================================
 * CONTROLLER: CHỨNG TỪ TÀI CHÍNH (SV4 - UC057)
 * ==============================================================================
 * 1. GET /api/v1/finance/documents/mine?type=   : chứng từ của chính user đang đăng nhập
 *    (SV1 Contracts and Documents hiện hóa đơn, SV3 hiện biên nhận).
 * 2. GET /api/v1/finance/documents/transaction/{id} : chứng từ của 1 đơn (chi tiết đơn II.4.7),
 *    chủ đơn hoặc nhân sự tài chính; người khác 403, đơn chưa thu 404.
 * Không có API tạo / sửa: chứng từ chỉ do hệ thống phát hành khi đơn SUCCESS và hủy khi hoàn toàn phần.
 */
@RestController
@RequestMapping("/api/v1/finance/documents")
@RequiredArgsConstructor
public class FinancialDocumentController {

    private final FinancialDocumentService documentService;
    private final FinanceCurrentUser currentUser;

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<FinancialDocumentResponse>>> getMine(@RequestParam(required = false) String type) {
        List<FinancialDocumentResponse> docs = documentService.getMine(currentUser.require().userId(), type);
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách chứng từ thành công", docs));
    }

    @GetMapping("/transaction/{transactionId}")
    public ResponseEntity<ApiResponse<FinancialDocumentResponse>> getForTransaction(@PathVariable Long transactionId) {
        FinancialDocumentResponse doc = documentService.getForTransaction(currentUser.require(), transactionId);
        return ResponseEntity.ok(ApiResponse.ok("Lấy chứng từ thành công", doc));
    }
}
