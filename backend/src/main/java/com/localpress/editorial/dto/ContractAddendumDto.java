package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO đại diện cho một phụ lục hợp đồng quảng cáo (Màn II.2.9 - UC019).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractAddendumDto {

    private Long addendumId;
    private Long campaignId;
    private String addendumNumber;
    private LocalDate effectiveDate;
    private String adjustmentType;
    private String notes;
    private LocalDateTime createdAt;
    private String createdBy;
}
