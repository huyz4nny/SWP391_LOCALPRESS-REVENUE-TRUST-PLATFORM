package com.localpress.finance.repository;

import com.localpress.finance.model.WalletEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WalletEntryRepository extends JpaRepository<WalletEntry, Long> {

    boolean existsByTransactionIdAndDirection(Long transactionId, WalletEntry.Direction direction);

    Page<WalletEntry> findByWalletIdOrderByCreatedAtDesc(Long walletId, Pageable pageable);
}
