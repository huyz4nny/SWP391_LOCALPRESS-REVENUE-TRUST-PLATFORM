package com.localpress.finance.controller;

import com.localpress.finance.dto.request.ProposeRefundRequest;
import com.localpress.finance.dto.request.ReviewRefundRequest;
import com.localpress.finance.dto.response.RefundDetailResponse;
import com.localpress.finance.service.RefundManagementService;
import com.localpress.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ==============================================================================
 * CONTROLLER: QUẢN LÝ HOÀN TIỀN THEO NGUYÊN TẮC 4 MẮT (SV4 - UC055, UC056)
 * ==============================================================================
 * Phân hệ: com.localpress.finance (SV4 - Huy)
 * Màn hình UI: II.4.7 Refund and Rights Management (/backoffice/finance/refunds)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance/refunds")
@RequiredArgsConstructor
public class RefundManagementController {

    private final RefundManagementService refundManagementService;

    /**
     * UC055: Lấy danh sách yêu cầu hoàn tiền.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<RefundDetailResponse>>> getRefunds() {
        log.info("API GET /api/v1/finance/refunds - Lấy danh sách yêu cầu hoàn tiền");
        List<RefundDetailResponse> list = refundManagementService.getRefundsList();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách yêu cầu hoàn tiền thành công", list));
    }

    /**
     * UC055: Nhân viên / Kế toán lập đề xuất hoàn tiền (Mắt 1 & 2).
     */
    @PostMapping("/propose")
    public ResponseEntity<ApiResponse<RefundDetailResponse>> proposeRefund(
            @RequestHeader(value = "X-User-Id", defaultValue = "2") Long proposerUserId,
            @Valid @RequestBody ProposeRefundRequest request
    ) {
        log.info("API POST /api/v1/finance/refunds/propose - Proposer #{}, đơn: {}, số tiền: {}",
                proposerUserId, request.getOrderId(), request.getRefundAmount());

        RefundDetailResponse response = refundManagementService.proposeRefund(proposerUserId, request);
        return ResponseEntity.ok(ApiResponse.ok("Đã lập phiếu đề xuất hoàn tiền thành công", response));
    }

    /**
     * UC055, UC056: Kế toán trưởng phê duyệt / từ chối hoàn tiền (Mắt 3 & 4) và thu hồi quyền lợi.
     */
    @PostMapping("/{id}/review-refund")
    public ResponseEntity<ApiResponse<RefundDetailResponse>> reviewRefund(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long reviewerUserId,
            @Valid @RequestBody ReviewRefundRequest request
    ) {
        log.info("API POST /api/v1/finance/refunds/{}/review-refund - Reviewer #{}, duyệt: {}",
                id, reviewerUserId, request.isApproved());

        RefundDetailResponse response = refundManagementService.reviewRefund(reviewerUserId, id, request);
        String msg = request.isApproved() ? "Đã duyệt hoàn tiền và thu hồi quyền lợi thành công" : "Đã từ chối yêu cầu hoàn tiền";
        return ResponseEntity.ok(ApiResponse.ok(msg, response));
    }
}
