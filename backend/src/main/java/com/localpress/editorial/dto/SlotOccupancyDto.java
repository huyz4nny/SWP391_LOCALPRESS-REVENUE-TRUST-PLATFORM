package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO tỷ lệ lấp đầy tồn kho quảng cáo cho từng slot (Màn II.2.10 - UC015).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotOccupancyDto {

    private String slotCode;
    private String slotName;
    private String dimensions;
    private int capacity;
    private BigDecimal basePrice;
    private String pricingType;
    private int activeCampaignsCount;
    private double occupancyPercentage;
    private String status; // NORMAL, NEAR_FULL, FULL
}
