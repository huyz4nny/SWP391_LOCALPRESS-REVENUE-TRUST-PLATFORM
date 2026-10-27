package com.localpress.finance.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * ENTITY: SỔ CHI TIẾT VÍ (WALLET ENTRY)
 * ==============================================================================
 * Mỗi lần cộng/trừ ví sinh 1 dòng, gắn với đúng 1 transaction.
 * UNIQUE(transaction_id, direction) là chốt chặn cuối cùng ở tầng DB chống cộng trùng (Rule 5).
 */
@Entity
@Table(name = "wallet_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletEntry {

    public enum Direction { CREDIT, DEBIT }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    private Long entryId;

    @Column(name = "wallet_id", nullable = false)
    private Long walletId;

    @Column(name = "transaction_id", nullable = false)
    private Long transactionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false)
    private Direction direction;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "balance_after", nullable = false, precision = 14, scale = 2)
    private BigDecimal balanceAfter;

    @Column(name = "reason", length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
