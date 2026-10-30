package com.localpress.finance.controller;

import com.localpress.finance.dto.response.AdvertiserReceivableResponse;
import com.localpress.finance.service.AdvertiserReceivablesService;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ==============================================================================
 * CONTROLLER: BÁO CÁO CÔNG NỢ DOANH NGHIỆP QUẢNG CÁO B2B (SV4 - UC053)
 * ==============================================================================
 * Phân hệ: com.localpress.finance (SV4 - Huy)
 * Màn hình UI: II.4.10 Advertiser Receivables (/backoffice/finance/receivables)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance/receivables")
@RequiredArgsConstructor
public class AdvertiserReceivablesController {

    private final AdvertiserReceivablesService advertiserReceivablesService;
    private final FinanceCurrentUser currentUser;

    /**
     * UC053: Lấy danh sách công nợ quảng cáo B2B, phân loại theo tuổi nợ và hạn thanh toán.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AdvertiserReceivableResponse>>> getReceivables() {
        log.info("API GET /api/v1/finance/receivables - Lấy báo cáo công nợ B2B");
        List<AdvertiserReceivableResponse> list = advertiserReceivablesService.getReceivablesList();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách công nợ quảng cáo thành công", list));
    }

    /**
     * UC053: Gửi nhắc nợ cho 1 chiến dịch (lưu receivable_reminders, phát ReceivableReminderEvent cho SV1).
     * Body: {"note": "..."} (không bắt buộc).
     */
    @PostMapping("/{campaignId}/reminders")
    public ResponseEntity<ApiResponse<AdvertiserReceivableResponse>> sendReminder(
            @PathVariable Long campaignId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        Long accountantId = currentUser.requireFinanceStaff("Chỉ nhân sự tài chính được gửi nhắc nợ").userId();
        String note = body != null ? body.get("note") : null;
        AdvertiserReceivableResponse response = advertiserReceivablesService.sendReminder(campaignId, accountantId, note);
        return ResponseEntity.ok(ApiResponse.ok("Đã ghi nhận nhắc nợ chiến dịch #" + campaignId, response));
    }
}
