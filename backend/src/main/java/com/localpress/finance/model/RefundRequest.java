package com.localpress.finance.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * THỰC THỂ QUẢN LÝ HOÀN TIỀN THEO NGUYÊN TẮC 4 MẮT (SV4 - REFUND REQUEST)
 * ==============================================================================
 * Bảng CSDL: refund_requests (xem định nghĩa DDL tại V1__create_tables.sql).
 * Tuân thủ nghiêm ngặt:
 * - Four-Eyes Principle: proposed_by != reviewed_by (Người lập khác người duyệt).
 * - Rule 11 (Refund Cap): Tổng tiền hoàn không được vượt quá số tiền đơn gốc.
 */
@Entity
@Table(name = "refund_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refund_id")
    private Long refundId;

    /**
     * ID giao dịch gốc được yêu cầu hoàn tiền.
     */
    @Column(name = "transaction_id", nullable = false)
    private Long transactionId;

    /**
     * ID độc giả hoặc khách hàng nhận hoàn tiền.
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * Số tiền yêu cầu hoàn (VNĐ).
     */
    @Column(name = "refund_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal refundAmount;

    /**
     * Lý do hoàn tiền (lỗi kỹ thuật, quét trùng, hủy gói...).
     */
    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    /**
     * Link ảnh chụp bằng chứng giao dịch hoặc biên nhận chuyển tiền.
     */
    @Column(name = "evidence_url", length = 1000)
    private String evidenceUrl;

    /**
     * Trạng thái phê duyệt: PENDING (Chờ duyệt), APPROVED (Đã duyệt), REJECTED (Từ chối), COMPLETED (Đã hoàn tiền).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING;

    /**
     * ID Kế toán viên hoặc Nhân viên CSKH lập đề xuất hoàn tiền (Mắt thứ 1 & 2).
     */
    @Column(name = "proposed_by")
    private Long proposedBy;

    /**
     * ID Kế toán trưởng hoặc Admin phê duyệt hoàn tiền (Mắt thứ 3 & 4).
     */
    @Column(name = "reviewed_by")
    private Long reviewedBy;

    /**
     * Ý kiến nhận xét / ghi chú của người phê duyệt.
     */
    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
