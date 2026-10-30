package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO đại diện cho một chiến dịch quảng cáo với các phiên bản creatives và chỉ số CTR (Màn II.2.6).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorialCampaignDto {
    private String id;
    private String bookingId;
    private String advertiserId;
    private String companyName;
    private String slotId;
    private String slotName;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalBudget;
    private String status;
    private Integer activeCreativeVersion;
    private List<EditorialCreativeDto> creatives;
    private long impressions;
    private long clicks;
    private BigDecimal ctr;
    private List<DailyStatDto> dailyStats;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyStatDto {
        private LocalDate date;
        private long impressions;
        private long clicks;
        private BigDecimal ctr;
    }
}
