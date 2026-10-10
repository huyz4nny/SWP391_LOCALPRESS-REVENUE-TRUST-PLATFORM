package com.localpress.finance.dto.response;

import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * DTO RESPONSE: BẢN GHI DÒNG TRÊN BẢNG SỔ QUỸ TÀI CHÍNH (UC047)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionLedgerResponse {

    private Long transactionId;
    private Long userId;
    private TransactionType transactionType;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private String gatewayTransactionId;
    private String bankCode;
    private TransactionStatus status;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private Long targetId;

    /**
     * Chuyển đổi từ JPA Entity sang DTO phẳng.
     */
    public static TransactionLedgerResponse fromEntity(Transaction tx) {
        if (tx == null) return null;
        return TransactionLedgerResponse.builder()
                .transactionId(tx.getTransactionId())
                .userId(tx.getUserId())
                .transactionType(tx.getTransactionType())
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .paymentMethod(tx.getPaymentMethod())
                .gatewayTransactionId(tx.getGatewayTransactionId())
                .bankCode(tx.getBankCode())
                .status(tx.getStatus())
                .paidAt(tx.getPaidAt())
                .createdAt(tx.getCreatedAt())
                .targetId(tx.resolveTargetId())
                .build();
    }
}
