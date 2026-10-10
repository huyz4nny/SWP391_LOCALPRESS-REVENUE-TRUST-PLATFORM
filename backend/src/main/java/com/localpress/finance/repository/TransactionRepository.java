package com.localpress.finance.repository;

import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Optional;

/**
 * ==============================================================================
 * REPOSITORY: QUẢN LÝ DỮ LIỆU GIAO DỊCH TÀI CHÍNH & SỔ QUÝ (SV4 - HUY)
 * ==============================================================================
 * - Phục vụ các nghiệp vụ trong Iteration 1:
 *   + UC047: Tra cứu danh sách chứng từ & sổ quỹ theo bộ lọc đa tiêu chí.
 *   + UC048: Tra cứu chi tiết chứng từ giao dịch.
 *   + UC049: Tổng hợp số liệu sổ quỹ (Tổng thu, tổng chi/hoàn, số lượng đơn).
 *   + UC050: Hàng đợi giao dịch chuyển khoản thủ công cần xác nhận.
 *   + UC051: Xác nhận / Từ chối giao dịch chuyển khoản.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /**
     * Tra cứu giao dịch theo mã bút toán ngân hàng / mã gateway (chống trùng lặp Idempotency).
     */
    Optional<Transaction> findByGatewayTransactionId(String gatewayTransactionId);

    /**
     * UC050: Lấy danh sách giao dịch chuyển khoản thủ công đang ở trạng thái PENDING để Kế toán đối soát.
     */
    Page<Transaction> findByStatusAndPaymentMethodIn(
            TransactionStatus status,
            Collection<String> paymentMethods,
            Pageable pageable
    );

    /**
     * UC047: Tra cứu sổ quỹ tài chính (Ledger) với bộ lọc linh hoạt (Status, Type, Khoảng thời gian, Keyword).
     */
    @Query("""
        SELECT t FROM Transaction t
        WHERE (:status IS NULL OR t.status = :status)
          AND (:transactionType IS NULL OR t.transactionType = :transactionType)
          AND (:paymentMethod IS NULL OR LOWER(t.paymentMethod) = LOWER(:paymentMethod))
          AND (:fromDate IS NULL OR t.createdAt >= :fromDate)
          AND (:toDate IS NULL OR t.createdAt <= :toDate)
          AND (:keyword IS NULL OR (
                CAST(t.transactionId AS string) LIKE %:keyword%
                OR LOWER(COALESCE(t.gatewayTransactionId, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR CAST(t.userId AS string) LIKE %:keyword%
          ))
        ORDER BY t.createdAt DESC
    """)
    Page<Transaction> searchLedger(
            @Param("status") TransactionStatus status,
            @Param("transactionType") TransactionType transactionType,
            @Param("paymentMethod") String paymentMethod,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    /**
     * UC049: Tính tổng số tiền thu về thành công (không tính các giao dịch hoàn tiền).
     */
    @Query("""
        SELECT COALESCE(SUM(t.amount), 0)
        FROM Transaction t
        WHERE t.status = 'SUCCESS'
          AND t.transactionType != 'REFUND'
    """)
    BigDecimal calculateTotalGrossRevenue();

    /**
     * UC049: Tính tổng số tiền đã hoàn trả cho khách hàng (giao dịch loại REFUND thành công).
     */
    @Query("""
        SELECT COALESCE(SUM(t.amount), 0)
        FROM Transaction t
        WHERE t.status = 'SUCCESS'
          AND t.transactionType = 'REFUND'
    """)
    BigDecimal calculateTotalRefundedAmount();

    /**
     * Đếm số lượng giao dịch theo trạng thái cụ thể.
     */
    long countByStatus(TransactionStatus status);

    /**
     * Đếm số lượng giao dịch chuyển khoản thủ công đang chờ Kế toán duyệt (UC050).
     */
    long countByStatusAndPaymentMethodIn(TransactionStatus status, Collection<String> paymentMethods);
}
