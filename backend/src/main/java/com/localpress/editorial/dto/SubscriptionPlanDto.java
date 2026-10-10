package com.localpress.editorial.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO trả về thông tin gói đọc hội viên cho màn hình Content Policy and Moderation (UC028).
 * Khớp 100% với kiểu SubscriptionPlan của React Frontend.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlanDto {

    private String id;
    private String name;
    private String code;
    private BigDecimal price;
    private int durationDays;
    private String description;
    private List<String> features;

    @JsonProperty("hasAdFree")
    private boolean hasAdFree;

    @JsonProperty("hasAudio")
    private boolean hasAudio;

    @JsonProperty("isActive")
    private boolean isActive;

    private String status;
}
