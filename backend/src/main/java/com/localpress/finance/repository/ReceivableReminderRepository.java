package com.localpress.finance.repository;

import com.localpress.finance.model.ReceivableReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReceivableReminderRepository extends JpaRepository<ReceivableReminder, Long> {

    Optional<ReceivableReminder> findFirstByCampaignIdOrderBySentAtDesc(Long campaignId);

    long countByCampaignId(Long campaignId);
}
