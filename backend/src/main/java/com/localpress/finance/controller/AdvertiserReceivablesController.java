package com.localpress.finance.controller;

import com.localpress.finance.dto.response.AdvertiserReceivableResponse;
import com.localpress.finance.service.AdvertiserReceivablesService;
import com.localpress.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * ==============================================================================
 * CONTROLLER: BÁO CÁO CÔNG NỢ DOANH NGHIỆP QUẢNG CÁO B2B (SV4 - UC053)
 * ==============================================================================
 * Phân hệ: com.localpress.finance (SV4 - Huy)
 * Màn hình UI: II.4.4 Advertiser Receivables (/backoffice/finance/orders?type=AD_CAMPAIGN)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance/receivables")
@RequiredArgsConstructor
public class AdvertiserReceivablesController {

    private final AdvertiserReceivablesService advertiserReceivablesService;

    /**
     * UC053: Lấy danh sách công nợ quảng cáo B2B, phân loại theo tuổi nợ và hạn thanh toán.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AdvertiserReceivableResponse>>> getReceivables() {
        log.info("API GET /api/v1/finance/receivables - Lấy báo cáo công nợ B2B");
        List<AdvertiserReceivableResponse> list = advertiserReceivablesService.getReceivablesList();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách công nợ quảng cáo thành công", list));
    }
}
