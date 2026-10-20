package com.localpress.finance.model;

import com.localpress.shared.exception.AppException;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * ENTITY: VÍ LOCALPRESS CỦA NGƯỜI DÙNG (SV4 - Huy)
 * ==============================================================================
 * Mỗi user có tối đa 1 ví (uk_wallets_user). Số dư không bao giờ âm (chk_wallets_balance).
 * Mọi thay đổi số dư phải đi qua WalletService để luôn kèm 1 dòng wallet_entries.
 */
@Entity
@Table(name = "wallets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wallet_id")
    private Long walletId;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "balance", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    public void credit(BigDecimal amount) {
        this.balance = this.balance.add(amount);
        this.updatedAt = LocalDateTime.now();
    }

    public void debit(BigDecimal amount) {
        if (this.balance.compareTo(amount) < 0) {
            throw new AppException(
                    "Số dư ví không đủ (Hiện có: " + this.balance.toPlainString() + " VND, cần: " + amount.toPlainString() + " VND)",
                    HttpStatus.PAYMENT_REQUIRED
            );
        }
        this.balance = this.balance.subtract(amount);
        this.updatedAt = LocalDateTime.now();
    }
}
