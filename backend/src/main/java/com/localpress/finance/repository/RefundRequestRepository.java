package com.localpress.finance.repository;

import com.localpress.finance.model.RefundRequest;
import com.localpress.finance.model.RefundStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * ==============================================================================
 * REPOSITORY: QUẢN LÝ YÊU CẦU HOÀN TIỀN 4 MẮT (SV4 - HUY)
 * ==============================================================================
 */
@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    long countByStatus(RefundStatus status);

    /** Khóa dòng khi duyệt: kế toán trưởng bấm "Duyệt" 2 lần cùng lúc chỉ sinh 1 bút toán REFUND. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RefundRequest r WHERE r.refundId = :id")
    Optional<RefundRequest> findByIdForUpdate(@Param("id") Long id);

    /**
     * Rule 11 (Refund Cap): Tính tổng tiền đã hoàn hoặc đang chờ duyệt của một giao dịch
     * để đảm bảo không hoàn vượt quá số tiền thực thu của đơn gốc.
     */
    @Query("""
        SELECT SUM(r.refundAmount)
        FROM RefundRequest r
        WHERE r.transactionId = :transactionId
          AND r.status IN (com.localpress.finance.model.RefundStatus.PENDING, com.localpress.finance.model.RefundStatus.APPROVED, com.localpress.finance.model.RefundStatus.COMPLETED)
          AND (:excludeRefundId IS NULL OR r.refundId != :excludeRefundId)
    """)
    BigDecimal sumCommittedRefundsByTransactionId(
            @Param("transactionId") Long transactionId,
            @Param("excludeRefundId") Long excludeRefundId
    );

    /**
     * Tổng tiền đã hoàn THẬT (COMPLETED) của một giao dịch: dùng để quyết định hoàn toàn phần hay một phần
     * khi duyệt. Không cộng phiếu đang chờ của người khác, nếu không duyệt phiếu đầu đã bị tính là hoàn hết.
     */
    @Query("""
        SELECT SUM(r.refundAmount)
        FROM RefundRequest r
        WHERE r.transactionId = :transactionId
          AND r.status = com.localpress.finance.model.RefundStatus.COMPLETED
    """)
    BigDecimal sumCompletedRefundsByTransactionId(@Param("transactionId") Long transactionId);
}
