package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * ==============================================================================
 * DTO: KỲ ĐỐI SOÁT TÀI CHÍNH NGÂN HÀNG (SV4 - UC054)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconciliationPeriodResponse {

    private String id;

    private String periodName;

    private String startDate;

    private String endDate;

    private BigDecimal totalSystemRevenue;

    private BigDecimal totalGatewayRevenue;

    private BigDecimal discrepancyTotal;

    /**
     * OPEN, RECONCILED, CLOSED
     */
    private String status;

    private List<DiscrepancyItem> discrepancies;

    private String closedAt;

    private String closedByName;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscrepancyItem {
        private String id;
        private String transactionCode;
        private String orderCode;
        private BigDecimal systemAmount;
        private BigDecimal gatewayAmount;
        private BigDecimal discrepancyAmount;
        private String reason;
        private String status; // UNRESOLVED, RESOLVED
        private String resolutionNote;
        private String resolvedBy;
        private String resolvedAt;
    }
}
