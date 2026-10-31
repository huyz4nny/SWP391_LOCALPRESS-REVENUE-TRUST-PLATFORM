package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO đại diện cho một yêu cầu booking quảng cáo phía tòa soạn (Màn II.2.3 & II.2.5).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorialBookingDto {
    private String id;
    private String advertiserId;
    private String companyName;
    private String contactPerson;
    private String contactPhone;
    private String contactEmail;
    private String slotId;
    private String slotName;
    private String slotCode;
    private LocalDate startDate;
    private LocalDate endDate;
    private long daysCount;
    private BigDecimal standardPrice;
    private BigDecimal discountPercent;
    private BigDecimal finalPrice;
    private String quotationNotes;
    private String rejectionReason;
    private String bookingStatus;
    private String paymentStatus;
    private String deliveryStatus;
    private String campaignId;
    private boolean termsAccepted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
