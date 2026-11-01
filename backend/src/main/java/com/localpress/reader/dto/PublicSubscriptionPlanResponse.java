package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// gói ACTIVE bán cho độc giả, kèm phạm vi ALL hoặc CATEGORY từ V8
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicSubscriptionPlanResponse {
    private Long id;
    private String name;
    private BigDecimal price;
    private int durationDays;
    private boolean hasAdFree;
    private boolean hasAudio;
    private String status;
    private String accessScope;
    private Long categoryId;
    private String categoryName;
}
