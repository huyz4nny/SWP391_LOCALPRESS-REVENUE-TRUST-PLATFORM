package com.localpress.finance.model;

import com.localpress.shared.exception.AppException;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * ENTITY: KHIẾU NẠI THANH TOÁN CHƯA ĐƯỢC GHI NHẬN (SV4 - UC051)
 * ==============================================================================
 * Khách đã chuyển tiền nhưng hệ thống không nhận được webhook (hoặc ghi sai nội dung CK).
 * Kế toán đối chiếu sao kê ngân hàng rồi Ghi nhận (RESOLVED) hoặc Từ chối có lý do (REJECTED).
 */
@Entity
@Table(name = "payment_complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentComplaint {

    public enum Status { OPEN, RESOLVED, REJECTED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "complaint_id")
    private Long complaintId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Mã đơn khách đang thanh toán (có thể trống nếu khách không nhớ). */
    @Column(name = "order_code", length = 255)
    private String orderCode;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "transferred_at", nullable = false)
    private LocalDateTime transferredAt;

    /** Mã giao dịch trên biên lai ngân hàng. UNIQUE: 1 lần chuyển chỉ khiếu nại 1 lần. */
    @Column(name = "bank_reference", nullable = false, unique = true, length = 100)
    private String bankReference;

    @Column(name = "note", length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.OPEN;

    /** Kết quả xử lý: trạng thái từ luồng webhook (SUCCESS, UNDERPAID_CREDITED_TO_WALLET, ...) hoặc CREDITED_WALLET. */
    @Column(name = "resolution", length = 50)
    private String resolution;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public void resolve(Long accountantId, String resolution, String note) {
        assertOpen();
        this.status = Status.RESOLVED;
        this.resolution = resolution;
        this.resolutionNote = note;
        this.resolvedBy = accountantId;
        this.resolvedAt = LocalDateTime.now();
    }

    public void reject(Long accountantId, String reason) {
        assertOpen();
        if (reason == null || reason.isBlank()) {
            throw new AppException("Phải nhập lý do từ chối để thông báo cho khách", HttpStatus.BAD_REQUEST);
        }
        this.status = Status.REJECTED;
        this.resolutionNote = reason.trim();
        this.resolvedBy = accountantId;
        this.resolvedAt = LocalDateTime.now();
    }

    private void assertOpen() {
        if (this.status != Status.OPEN) {
            throw new AppException("Khiếu nại #" + complaintId + " đã được xử lý (" + status + ")", HttpStatus.CONFLICT);
        }
    }
}
