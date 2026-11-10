package com.localpress.finance.repository;

import com.localpress.finance.model.SepayWebhookLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SepayWebhookLogRepository extends JpaRepository<SepayWebhookLog, Long> {

    boolean existsBySepayId(Long sepayId);

    List<SepayWebhookLog> findAllByOrderByReceivedAtDesc(Pageable pageable);

    /**
     * Màn hình Nhật ký SePay: phân trang, lọc nguồn và khoảng thời gian nhận (from bao gồm, to không bao gồm).
     * Tham số null nghĩa là không lọc. Dùng index idx_sepay_logs_received.
     */
    @Query(value = "SELECT l FROM SepayWebhookLog l "
            + "WHERE (:source IS NULL OR l.source = :source) "
            + "AND (:from IS NULL OR l.receivedAt >= :from) "
            + "AND (:to IS NULL OR l.receivedAt < :to) "
            + "ORDER BY l.receivedAt DESC, l.logId DESC",
            countQuery = "SELECT COUNT(l) FROM SepayWebhookLog l "
            + "WHERE (:source IS NULL OR l.source = :source) "
            + "AND (:from IS NULL OR l.receivedAt >= :from) "
            + "AND (:to IS NULL OR l.receivedAt < :to)")
    Page<SepayWebhookLog> search(@Param("source") SepayWebhookLog.Source source,
                                 @Param("from") LocalDateTime from,
                                 @Param("to") LocalDateTime to,
                                 Pageable pageable);

    List<SepayWebhookLog> findBySourceOrderByReceivedAtDesc(SepayWebhookLog.Source source, Pageable pageable);

    List<SepayWebhookLog> findByOrderCodeOrderByReceivedAtDesc(String orderCode);

    /** Khoản tiền có mã GD ngân hàng này đã được ghi nhận tự động chưa (chặn khiếu nại ghi nhận lần 2). */
    Optional<SepayWebhookLog> findFirstByReferenceCodeAndResultStatusInOrderByReceivedAtAsc(String referenceCode, Collection<String> statuses);

    /** Số tiền SePay thật sự báo về cho mã GD này (bỏ log sai khóa: ai cũng gửi được). Dùng đối chiếu số tiền khách khai. */
    Optional<SepayWebhookLog> findFirstByReferenceCodeAndAuthOkTrueAndTransferAmountNotNullOrderByReceivedAtAsc(String referenceCode);

    /** Tổng tiền SePay thật đã ghi nhận vào đơn trên toàn bộ nhật ký (bỏ nguồn giả lập và log sai khóa). */
    @Query("SELECT COALESCE(SUM(l.transferAmount), 0) FROM SepayWebhookLog l "
            + "WHERE l.source <> :excluded AND l.authOk = true AND l.resultStatus = 'SUCCESS'")
    BigDecimal sumRecordedAmount(@Param("excluded") SepayWebhookLog.Source excluded);

    /** Số lần SePay thật báo về (webhook + đồng bộ), bỏ giả lập và log sai khóa. */
    long countBySourceNotAndAuthOkTrue(SepayWebhookLog.Source excluded);
}
