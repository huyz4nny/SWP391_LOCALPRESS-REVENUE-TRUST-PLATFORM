package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * ==============================================================================
 * DTO: BÁO CÁO CÔNG NỢ DOANH NGHIỆP QUẢNG CÁO B2B (SV4 - UC053)
 * ==============================================================================
 * Phục vụ Kế toán theo dõi các khoản nợ hợp đồng quảng cáo, phân loại tuổi nợ,
 * và cảnh báo quá hạn để phối hợp tạm dừng phân phối quảng cáo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdvertiserReceivableResponse {

    private Long campaignId;

    private String campaignName;

    private Long advertiserId;

    private String companyName;

    private String taxCode;

    private String contactPerson;

    private String email;

    private String phone;

    private String contractReference;

    /**
     * Giá trị hợp đồng báo giá đã chốt (VNĐ).
     */
    private BigDecimal contractValue;

    /**
     * Số tiền doanh nghiệp đã thanh toán thành công (VNĐ).
     */
    private BigDecimal paidAmount;

    /**
     * Số tiền công nợ còn phải thu (VNĐ) = contractValue - paidAmount.
     */
    private BigDecimal remainingDebt;

    private LocalDate startDate;

    /**
     * Hạn thanh toán (chính là end_date hoặc ngày quy định trong hợp đồng).
     */
    private LocalDate dueDate;

    /**
     * Số ngày quá hạn thanh toán (nếu đã quá hạn).
     */
    private long overdueDays;

    /**
     * Trạng thái thanh toán: UNPAID, PENDING, PAID, REFUNDED.
     */
    private String paymentStatus;

    /**
     * Trạng thái chiến dịch: DRAFT, PENDING, APPROVED, ACTIVE, REJECTED, COMPLETED, SUSPENDED.
     */
    private String campaignStatus;

    /**
     * Nhóm tuổi nợ: PAID_IN_FULL (Đã tất toán), IN_TERM (Trong hạn), OVERDUE (Quá hạn).
     */
    private String debtGroup;
}
