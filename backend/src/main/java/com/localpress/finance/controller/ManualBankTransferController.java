package com.localpress.finance.controller;

import com.localpress.finance.dto.request.ManualTransferConfirmRequest;
import com.localpress.finance.dto.request.ManualTransferRejectRequest;
import com.localpress.finance.dto.response.TransactionDetailResponse;
import com.localpress.finance.dto.response.TransactionLedgerResponse;
import com.localpress.finance.service.ManualBankTransferService;
import com.localpress.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * ==============================================================================
 * CONTROLLER: PHÊ DUYỆT CHUYỂN KHOẢN NGÂN HÀNG THỦ CÔNG (UC050, UC051)
 * ==============================================================================
 * - Phân hệ: com.localpress.finance (SV4 - Huy)
 * - Màn hình UI: II.4.2 Manual Bank Transfer Confirmation
 * - Các API cung cấp:
 *   + GET  /api/v1/finance/manual-transfers/pending              : Hàng đợi chuyển khoản chờ duyệt (UC050)
 *   + POST /api/v1/finance/manual-transfers/{id}/confirm        : Kế toán xác nhận nhận tiền (UC051)
 *   + POST /api/v1/finance/manual-transfers/{id}/reject         : Kế toán từ chối đơn chuyển khoản (UC051)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance/manual-transfers")
@RequiredArgsConstructor
public class ManualBankTransferController {

    private final ManualBankTransferService manualBankTransferService;

    /**
     * UC050: Lấy danh sách hàng đợi các đơn chuyển khoản ngân hàng đang chờ Kế toán duyệt.
     */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<Page<TransactionLedgerResponse>>> getPendingTransfers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        log.info("API GET /api/v1/finance/manual-transfers/pending - Lấy hàng đợi chờ duyệt");
        Page<TransactionLedgerResponse> result = manualBankTransferService.getPendingQueue(page, size);
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách chờ duyệt thành công", result));
    }

    /**
     * UC051: Kế toán bấm "Xác nhận" sau khi đối chiếu tiền đã vào tài khoản ngân hàng của tòa soạn.
     * Tự động phát tán PaymentSuccessEvent sang SV1/SV3 để cấp quyền đọc / kích hoạt quảng cáo.
     *
     * @param transactionId    ID giao dịch cần phê duyệt.
     * @param accountantUserId ID Kế toán viên (truyền qua Header X-User-Id, mặc định ID 2 - ketoan@localpress.vn).
     * @param request          Thông tin bút toán đối soát.
     */
    @PostMapping("/{transactionId}/confirm")
    public ResponseEntity<ApiResponse<TransactionDetailResponse>> confirmTransfer(
            @PathVariable Long transactionId,
            @RequestHeader(value = "X-User-Id", defaultValue = "2") Long accountantUserId,
            @Valid @RequestBody ManualTransferConfirmRequest request
    ) {
        log.info("API POST /api/v1/finance/manual-transfers/{}/confirm - Kế toán ID: {} xác nhận",
                transactionId, accountantUserId);
        TransactionDetailResponse result = manualBankTransferService.confirmTransfer(
                transactionId,
                accountantUserId,
                request
        );
        return ResponseEntity.ok(ApiResponse.ok("Xác nhận chuyển khoản thành công", result));
    }

    /**
     * UC051: Kế toán từ chối đơn chuyển khoản (do sai nội dung, chuyển thiếu tiền, v.v.).
     *
     * @param transactionId    ID giao dịch bị từ chối.
     * @param accountantUserId ID Kế toán viên từ chối.
     * @param request          Lý do từ chối (bắt buộc).
     */
    @PostMapping("/{transactionId}/reject")
    public ResponseEntity<ApiResponse<TransactionDetailResponse>> rejectTransfer(
            @PathVariable Long transactionId,
            @RequestHeader(value = "X-User-Id", defaultValue = "2") Long accountantUserId,
            @Valid @RequestBody ManualTransferRejectRequest request
    ) {
        log.warn("API POST /api/v1/finance/manual-transfers/{}/reject - Kế toán ID: {} từ chối",
                transactionId, accountantUserId);
        TransactionDetailResponse result = manualBankTransferService.rejectTransfer(
                transactionId,
                accountantUserId,
                request
        );
        return ResponseEntity.ok(ApiResponse.ok("Từ chối giao dịch chuyển khoản thành công", result));
    }
}
