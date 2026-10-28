package com.localpress.finance.model;

import com.localpress.shared.exception.AppException;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * ENTITY: KỲ ĐỐI SOÁT THEO THÁNG (SV4 - UC054)
 * ==============================================================================
 * Mỗi tháng 1 dòng (UNIQUE period_month). Kế toán trưởng chốt kỳ thì lưu ảnh chụp số liệu
 * (tổng ngân hàng, tổng hệ thống, số khoản lệch còn mở) và khóa mọi xử lý trong kỳ.
 */
@Entity
@Table(name = "reconciliation_periods")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReconciliationPeriod {

    public enum Status { OPEN, CLOSED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "period_id")
    private Long periodId;

    /** yyyy-MM */
    @Column(name = "period_month", nullable = false, unique = true, length = 7)
    private String periodMonth;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.OPEN;

    @Column(name = "bank_total", precision = 14, scale = 2)
    private BigDecimal bankTotal;

    @Column(name = "system_total", precision = 14, scale = 2)
    private BigDecimal systemTotal;

    @Column(name = "unresolved_count")
    private Integer unresolvedCount;

    @Column(name = "close_note", length = 500)
    private String closeNote;

    @Column(name = "closed_by")
    private Long closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public boolean isClosed() {
        return status == Status.CLOSED;
    }

    public void assertOpen() {
        if (isClosed()) {
            throw new AppException("Kỳ đối soát " + periodMonth + " đã chốt, không xử lý thêm được", HttpStatus.CONFLICT);
        }
    }

    public void close(Long managerId, BigDecimal bankTotal, BigDecimal systemTotal, int unresolvedCount, String note) {
        assertOpen();
        this.status = Status.CLOSED;
        this.bankTotal = bankTotal;
        this.systemTotal = systemTotal;
        this.unresolvedCount = unresolvedCount;
        this.closeNote = note;
        this.closedBy = managerId;
        this.closedAt = LocalDateTime.now();
    }
}
