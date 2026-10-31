package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * UC054: Kỳ đối soát 1 tháng. "Sao kê" = tiền SePay báo về tài khoản ngân hàng (sepay_webhook_logs),
 * "hệ thống" = tiền đã ghi vào đơn / ví từ ngân hàng (transactions không trả bằng ví).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconciliationPeriodResponse {

    /** REC-yyyyMM */
    private String id;

    /** yyyy-MM */
    private String month;

    private String periodName;

    private String startDate;

    private String endDate;

    /** Tiền hệ thống đã ghi nhận từ ngân hàng trong kỳ. */
    private BigDecimal totalSystemRevenue;

    /** Tiền SePay báo về tài khoản ngân hàng trong kỳ (mỗi giao dịch ngân hàng tính 1 lần). */
    private BigDecimal totalGatewayRevenue;

    /** Tổng số tiền các khoản lệch còn UNRESOLVED. */
    private BigDecimal discrepancyTotal;

    private int unresolvedCount;

    /**
     * OPEN (còn khoản lệch), RECONCILED (đã xử lý hết, chờ chốt), CLOSED (kế toán trưởng đã chốt)
     */
    private String status;

    private List<DiscrepancyItem> discrepancies;

    private String closedAt;

    private String closedByName;

    private String closeNote;

    /** Các tháng đã có kỳ đối soát, mới nhất trước (cho bộ chọn tháng). */
    private List<String> recentMonths;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscrepancyItem {
        private String id;
        /** BANK_NOT_RECORDED, RECORDED_WITHOUT_BANK */
        private String itemType;
        /** Mã GD ngân hàng (reference_code / bank_reference). */
        private String transactionCode;
        private String orderCode;
        private BigDecimal systemAmount;
        private BigDecimal gatewayAmount;
        private BigDecimal discrepancyAmount;
        private String reason;
        private String status; // UNRESOLVED, RESOLVED
        /** ASSIGN_ORDER, CREDIT_WALLET, EXPLAINED */
        private String action;
        private String actionRef;
        private String actionResult;
        private String resolutionNote;
        private String resolvedBy;
        private String resolvedAt;
        private Long logId;
        private Long complaintId;
    }
}
