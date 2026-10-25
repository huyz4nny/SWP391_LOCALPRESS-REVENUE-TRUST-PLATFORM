package com.localpress.finance.repository;

import com.localpress.finance.model.SepayWebhookLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SepayWebhookLogRepository extends JpaRepository<SepayWebhookLog, Long> {

    boolean existsBySepayId(Long sepayId);

    List<SepayWebhookLog> findAllByOrderByReceivedAtDesc(Pageable pageable);

    List<SepayWebhookLog> findBySourceOrderByReceivedAtDesc(SepayWebhookLog.Source source, Pageable pageable);

    List<SepayWebhookLog> findByOrderCodeOrderByReceivedAtDesc(String orderCode);
}
