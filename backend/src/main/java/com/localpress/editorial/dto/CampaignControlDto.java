package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO điều khiển vận hành chiến dịch quảng cáo (Màn II.2.8 - UC023, UC024).
 * Hỗ trợ Emergency Kill-Switch (Dừng khẩn cấp), Mở lại (Resume), và Bù ngày phát sóng (Make-Good).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignControlDto {

    private Long campaignId;
    private Long advertiserId;
    private String companyName;
    private String campaignName;
    private String slotCode;
    private String slotName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal amount;
    private String status;
    private String suspensionReason;
    private long totalPlannedDays;
    private long elapsedDays;
    private long makeGoodDaysAdded;
    private LocalDateTime lastControlledAt;
    private String lastControlledBy;
}
