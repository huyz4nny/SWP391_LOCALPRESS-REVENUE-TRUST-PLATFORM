package com.localpress.finance.controller;

import com.localpress.finance.dto.request.CreateComplaintRequest;
import com.localpress.finance.dto.request.ReviewComplaintRequest;
import com.localpress.finance.dto.response.ComplaintResponse;
import com.localpress.finance.model.PaymentComplaint;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentComplaintService;
import com.localpress.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ==============================================================================
 * CONTROLLER: KHIẾU NẠI THANH TOÁN CHƯA GHI NHẬN (SV4 - UC051)
 * ==============================================================================
 * Khách:   POST /api/v1/finance/complaints, GET /api/v1/finance/complaints/me
 * Kế toán: GET  /api/v1/finance/complaints?status=OPEN
 *          POST /api/v1/finance/complaints/{id}/resolve?target=ORDER|WALLET
 *          POST /api/v1/finance/complaints/{id}/reject  (bắt buộc lý do)
 * Phân quyền theo URL nằm ở SecurityConfig; kiểm tra lại vai trò kế toán tại đây.
 */
@RestController
@RequestMapping("/api/v1/finance/complaints")
@RequiredArgsConstructor
public class PaymentComplaintController {

    private final PaymentComplaintService complaintService;
    private final FinanceCurrentUser currentUser;

    @PostMapping
    public ResponseEntity<ApiResponse<ComplaintResponse>> create(@Valid @RequestBody CreateComplaintRequest request) {
        ComplaintResponse response = complaintService.create(currentUser.require().userId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Đã gửi khiếu nại, kế toán sẽ đối chiếu sao kê và phản hồi", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> listMine() {
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách khiếu nại thành công",
                complaintService.listMine(currentUser.require().userId())));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> listForAccountant(
            @RequestParam(required = false) PaymentComplaint.Status status
    ) {
        requireFinanceStaff();
        return ResponseEntity.ok(ApiResponse.ok("Lấy hàng chờ khiếu nại thành công", complaintService.listForAccountant(status)));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<ComplaintResponse>> resolve(
            @PathVariable Long id,
            @RequestParam(required = false) PaymentComplaintService.Target target,
            @Valid @RequestBody(required = false) ReviewComplaintRequest request
    ) {
        Long accountantId = requireFinanceStaff().userId();
        ComplaintResponse response = complaintService.resolve(id, accountantId, target, request != null ? request.getNote() : null);
        return ResponseEntity.ok(ApiResponse.ok("Đã ghi nhận khoản thanh toán của khiếu nại #" + id, response));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<ComplaintResponse>> reject(
            @PathVariable Long id,
            @Valid @RequestBody ReviewComplaintRequest request
    ) {
        Long accountantId = requireFinanceStaff().userId();
        ComplaintResponse response = complaintService.reject(id, accountantId, request.getNote());
        return ResponseEntity.ok(ApiResponse.ok("Đã từ chối khiếu nại #" + id, response));
    }

    private FinanceCurrentUser.Principal requireFinanceStaff() {
        return currentUser.requireFinanceStaff("Chỉ kế toán mới được xử lý khiếu nại");
    }
}
