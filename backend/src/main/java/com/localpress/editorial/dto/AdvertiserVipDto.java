package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO phân hạng khách hàng doanh nghiệp VIP B2B (Màn II.2.9 - UC019, UC025).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdvertiserVipDto {

    private Long advertiserId;
    private String companyName;
    private String taxCode;
    private String contactPerson;
    private String email;
    private String phone;
    private BigDecimal totalSpent;
    private long campaignCount;
    private String vipTier; // STANDARD, SILVER, GOLD, DIAMOND
    private BigDecimal vipDiscountPercent;
    private LocalDateTime updatedAt;
}
