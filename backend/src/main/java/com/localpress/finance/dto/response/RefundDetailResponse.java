package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * DTO: CHI TIẾT YÊU CẦU HOÀN TIỀN (SV4 - UC055, UC056)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundDetailResponse {

    private String id;

    private String orderId;

    private String orderCode;

    private String transactionId;

    private String userId;

    private String userName;

    private String userEmail;

    private BigDecimal originalAmount;

    private BigDecimal refundAmount;

    private boolean isPartial;

    private String reason;

    private String evidenceUrl;

    private String status;

    private String affectedBenefit;

    private LocalDateTime requestedAt;

    private String proposedBy;

    private String proposedByName;

    private String reviewedBy;

    private String reviewedByName;

    private String reviewNotes;

    private LocalDateTime resolvedAt;
}
