package com.localpress.editorial.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Entity ánh xạ bảng 'subscription_plans' phục vụ UC028 (Quản lý danh mục gói đọc).
 * Cho phép Tòa soạn (SV2) xem, tạo mới, chỉnh sửa giá gói, thời hạn và bật/tắt gói đọc định kỳ.
 */
@Entity
@Table(name = "subscription_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditorialSubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Long planId;

    @Column(name = "name", nullable = false, unique = true, length = 120)
    private String name;

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "has_ad_free", nullable = false)
    private boolean hasAdFree;

    @Column(name = "has_audio", nullable = false)
    private boolean hasAudio;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PlanStatus status;

    public enum PlanStatus {
        ACTIVE, INACTIVE
    }

    public void updatePlan(String name, BigDecimal price, Integer durationDays, Boolean hasAdFree, Boolean hasAudio, PlanStatus status) {
        if (name != null && !name.isBlank()) {
            this.name = name.trim();
        }
        if (price != null && price.compareTo(BigDecimal.ZERO) >= 0) {
            this.price = price;
        }
        if (durationDays != null && durationDays > 0) {
            this.durationDays = durationDays;
        }
        if (hasAdFree != null) {
            this.hasAdFree = hasAdFree;
        }
        if (hasAudio != null) {
            this.hasAudio = hasAudio;
        }
        if (status != null) {
            this.status = status;
        }
    }
}
