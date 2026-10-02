package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * ==============================================================================
 * DTO RESPONSE: DỮ LIỆU TỔNG QUAN TÀI CHÍNH (FINANCE DASHBOARD)
 * ==============================================================================
 * Khớp đúng cấu trúc dữ liệu mà giao diện FinanceDashboard.tsx đang đón nhận.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinanceDashboardResponse {

    /**
     * Tổng doanh thu thực thu (Gross Revenue).
     */
    private BigDecimal totalRevenue;

    /**
     * Số đơn hàng đã thanh toán thành công (PAID/SUCCESS).
     */
    private long paidOrdersCount;

    /**
     * Số đơn hàng đang chờ duyệt hoặc chờ thanh toán (PENDING).
     */
    private long pendingOrdersCount;

    /**
     * Số yêu cầu hoàn tiền đang chờ kế toán/quản lý xét duyệt (PENDING).
     */
    private long refundReviewCount;

    /**
     * Số tiền chênh lệch đối soát ngân hàng (nếu có).
     */
    private BigDecimal reconciliationDiscrepancy;

    /**
     * Danh sách các giao dịch phát sinh gần đây nhất.
     */
    private List<TransactionLedgerResponse> recentOrders;
}
