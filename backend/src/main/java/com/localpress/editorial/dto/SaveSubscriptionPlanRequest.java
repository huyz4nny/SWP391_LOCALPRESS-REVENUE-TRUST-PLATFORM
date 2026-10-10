package com.localpress.editorial.dto;

import lombok.*;

import java.math.BigDecimal;

/**
 * Request body tạo mới hoặc cập nhật gói cước hội viên (UC028).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveSubscriptionPlanRequest {

    private String name;
    private BigDecimal price;
    private Integer durationDays;
    private Boolean hasAdFree;
    private Boolean hasAudio;
    private String status; // ACTIVE, INACTIVE
}
