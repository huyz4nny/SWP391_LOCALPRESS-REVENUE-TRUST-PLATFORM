package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO quản lý hồ sơ hợp đồng quảng cáo B2B (Màn II.2.9 - UC019, UC025).
 * Bao gồm đầy đủ 4 thông tin nghiệp vụ: số hợp đồng, ngày ký, giá trị, file đính kèm.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorialContractDto {

    private Long contractId;
    private Long campaignId;
    private Long advertiserId;
    private String companyName;
    private String taxCode;
    private String contactPerson;
    private String contactEmail;
    private String contactPhone;
    private String campaignName;
    private String slotCode;
    private String slotName;
    private String contractReference;
    private String contractNumber;
    private LocalDate signingDate;
    private String contractFileUrl;
    private BigDecimal contractValue;
    private LocalDate startDate;
    private LocalDate endDate;
    private String quotationStatus;
    private String paymentStatus;
    private String status;
    private String contractStatus;

    @Builder.Default
    private List<ContractAddendumDto> addendums = new ArrayList<>();
}
