package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * ==============================================================================
 * DTO RESPONSE: TỔNG QUAN CHỈ SỐ SỔ QUỸ TÀI CHÍNH (UC049)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerSummaryResponse {

    /**
     * Tổng số tiền thu thực tế (Gross Revenue) từ các đơn thành công (không gồm tiền hoàn).
     */
    private BigDecimal totalGrossRevenue;

    /**
     * Tổng số tiền đã hoàn trả cho khách hàng (Refunded Amount).
     */
    private BigDecimal totalRefundedAmount;

    /**
     * Doanh thu thuần (Net Revenue = Gross Revenue - Refunded Amount).
     */
    private BigDecimal netRevenue;

    /**
     * Số lượng giao dịch đang chờ xử lý (PENDING).
     */
    private long pendingCount;

    /**
     * Số lượng giao dịch thành công (SUCCESS).
     */
    private long successCount;

    /**
     * Số lượng giao dịch thất bại (FAILED).
     */
    private long failedCount;

    /**
     * Số lượng giao dịch chuyển khoản ngân hàng thủ công đang chờ Kế toán duyệt (UC050).
     */
    private long pendingManualTransfersCount;
}
