package com.localpress.finance.repository;

import com.localpress.finance.model.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

/**
 * ==============================================================================
 * REPOSITORY: QUẢN LÝ YÊU CẦU HOÀN TIỀN 4 MẮT (SV4 - HUY)
 * ==============================================================================
 */
@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    List<RefundRequest> findByTransactionId(Long transactionId);

    List<RefundRequest> findByStatusOrderByCreatedAtDesc(String status);

    long countByStatus(com.localpress.finance.model.RefundStatus status);

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
}
