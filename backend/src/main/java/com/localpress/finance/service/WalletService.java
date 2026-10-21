package com.localpress.finance.service;

import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.Wallet;
import com.localpress.finance.model.WalletEntry;
import com.localpress.finance.repository.WalletEntryRepository;
import com.localpress.finance.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * ==============================================================================
 * DỊCH VỤ VÍ LOCALPRESS (SV4 - Huy)
 * ==============================================================================
 * - credit: cộng ví khi nạp tiền thành công, tiền về muộn, chuyển thừa/thiếu, hoàn tiền về ví.
 * - debit : trừ ví khi khách thanh toán đơn hàng bằng số dư.
 * Bảo vệ 3 lớp: khóa dòng ví (PESSIMISTIC_WRITE), kiểm tra entry đã tồn tại (idempotent),
 * và UNIQUE(transaction_id, direction) + CHECK balance >= 0 ở tầng DB.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletEntryRepository walletEntryRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public Optional<Wallet> findByUserId(Long userId) {
        return walletRepository.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Page<WalletEntry> getEntries(Long walletId, int page, int size) {
        return walletEntryRepository.findByWalletIdOrderByCreatedAtDesc(walletId, PageRequest.of(page, size));
    }

    /**
     * Cộng ví cho chủ của transaction. Gọi lại nhiều lần với cùng transaction chỉ cộng 1 lần.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public WalletEntry credit(Transaction tx, BigDecimal amount, String reason) {
        return apply(tx, amount, WalletEntry.Direction.CREDIT, reason);
    }

    /**
     * Trừ ví của chủ transaction. Ném 402 nếu số dư không đủ, không bao giờ để số dư âm.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public WalletEntry debit(Transaction tx, BigDecimal amount, String reason) {
        return apply(tx, amount, WalletEntry.Direction.DEBIT, reason);
    }

    /**
     * Khóa dòng ví (tạo nếu chưa có) rồi trả số dư. Dùng trước khi tự trừ ví trong luồng webhook:
     * kiểm tra đủ tiền trước để không ném 402 làm rollback cả giao dịch nạp tiền.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public BigDecimal lockedBalance(Long userId) {
        return lockOrCreate(userId).getBalance();
    }

    private WalletEntry apply(Transaction tx, BigDecimal amount, WalletEntry.Direction direction, String reason) {
        Wallet wallet = lockOrCreate(tx.getUserId());

        if (walletEntryRepository.existsByTransactionIdAndDirection(tx.getTransactionId(), direction)) {
            log.info("Ví user #{} đã có bút toán {} cho giao dịch #{}. Bỏ qua (idempotent).",
                    tx.getUserId(), direction, tx.getTransactionId());
            return null;
        }

        if (direction == WalletEntry.Direction.CREDIT) {
            wallet.credit(amount);
        } else {
            wallet.debit(amount);
        }
        walletRepository.save(wallet);

        WalletEntry entry = walletEntryRepository.save(WalletEntry.builder()
                .walletId(wallet.getWalletId())
                .transactionId(tx.getTransactionId())
                .direction(direction)
                .amount(amount)
                .balanceAfter(wallet.getBalance())
                .reason(reason)
                .build());

        log.info("Ví user #{} {} {} VND (giao dịch #{}), số dư mới: {}",
                tx.getUserId(), direction, amount, tx.getTransactionId(), wallet.getBalance());
        return entry;
    }

    /**
     * INSERT IGNORE để 2 request đầu tiên cùng lúc không đụng UNIQUE(user_id), sau đó khóa dòng ví.
     */
    private Wallet lockOrCreate(Long userId) {
        jdbcTemplate.update("INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)", userId);
        return walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalStateException("Không tạo được ví cho user #" + userId));
    }
}
