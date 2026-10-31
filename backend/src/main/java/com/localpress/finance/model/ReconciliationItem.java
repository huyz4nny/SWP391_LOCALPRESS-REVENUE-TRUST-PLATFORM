package com.localpress.finance.model;

import com.localpress.shared.exception.AppException;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * ENTITY: KHOẢN LỆCH TRONG KỲ ĐỐI SOÁT (SV4 - UC054)
 * ==============================================================================
 * BANK_NOT_RECORDED     : SePay báo có tiền (log_id) nhưng hệ thống chưa ghi vào đơn / ví.
 * RECORDED_WITHOUT_BANK : kế toán đã ghi nhận theo khiếu nại (complaint_id) nhưng SePay chưa báo khoản đó.
 * Xử lý xong là RESOLVED với hành động + ghi chú + người xử lý; không bao giờ xóa dòng.
 */
@Entity
@Table(name = "reconciliation_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReconciliationItem {

    public enum Type { BANK_NOT_RECORDED, RECORDED_WITHOUT_BANK }

    public enum Status { UNRESOLVED, RESOLVED }

    /** ASSIGN_ORDER: ghi vào đơn (chạy luồng webhook) · CREDIT_WALLET: cộng ví khách · EXPLAINED: chỉ giải trình. */
    public enum Action { ASSIGN_ORDER, CREDIT_WALLET, EXPLAINED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long itemId;

    @Column(name = "period_id", nullable = false)
    private Long periodId;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private Type itemType;

    @Column(name = "log_id", unique = true)
    private Long logId;

    @Column(name = "complaint_id", unique = true)
    private Long complaintId;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    @Column(name = "order_code", length = 255)
    private String orderCode;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.UNRESOLVED;

    @Enumerated(EnumType.STRING)
    @Column(name = "action")
    private Action action;

    @Column(name = "action_ref", length = 255)
    private String actionRef;

    @Column(name = "action_result", length = 50)
    private String actionResult;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public void assertUnresolved() {
        if (status != Status.UNRESOLVED) {
            throw new AppException("Khoản lệch #" + itemId + " đã được xử lý", HttpStatus.CONFLICT);
        }
    }

    public void resolve(Long accountantId, Action action, String actionRef, String actionResult, String note) {
        assertUnresolved();
        if (note == null || note.isBlank()) {
            throw new AppException("Phải nhập ghi chú xử lý khoản lệch", HttpStatus.BAD_REQUEST);
        }
        this.status = Status.RESOLVED;
        this.action = action;
        this.actionRef = actionRef;
        this.actionResult = actionResult;
        this.resolutionNote = note.trim();
        this.resolvedBy = accountantId;
        this.resolvedAt = LocalDateTime.now();
    }
}
