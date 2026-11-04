package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO đánh giá 5 điều kiện tiên quyết kích hoạt quảng cáo (Màn II.2.7 - UC022, UC023, Rule 9).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignEligibilityDto {

    private Long campaignId;
    private Long advertiserId;
    private String companyName;
    private String campaignName;
    private String slotCode;
    private String slotName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal quotedAmount;
    private String status;

    // 1. Điều kiện thanh toán: PAID hoặc APPROVED_CREDIT
    private boolean paymentPassed;
    private String paymentStatus;
    private String paymentMessage;

    // 2. Điều kiện báo giá: ACCEPTED
    private boolean quotationPassed;
    private String quotationStatus;
    private String quotationMessage;

    // 3. Điều kiện hợp đồng: contract_reference != null & không rỗng
    private boolean contractPassed;
    private String contractReference;
    private String contractFileUrl;
    private String contractMessage;

    // 4. Điều kiện Creative: Bản mới nhất APPROVED và scan_status an toàn (SAFE hoặc null)
    private boolean creativePassed;
    private Integer creativeVersion;
    private String creativeReviewStatus;
    private String creativeScanStatus;
    private String creativeMediaUrl;
    private String creativeTargetUrl;
    private String creativeMessage;

    // 5. Điều kiện Vị trí hiển thị: Slot đang ACTIVE
    private boolean slotPassed;
    private String slotStatus;
    private String slotMessage;

    // Ngày hợp lệ (start_date <= today && end_date >= today)
    private boolean dateRangeValid;

    // Tổng hợp: Cả 5 điều kiện cốt lõi đều đạt
    private boolean overallEligible;

    // Có thể kích hoạt (đủ 5 điều kiện và trạng thái chưa phải ACTIVE)
    private boolean canActivate;
}
