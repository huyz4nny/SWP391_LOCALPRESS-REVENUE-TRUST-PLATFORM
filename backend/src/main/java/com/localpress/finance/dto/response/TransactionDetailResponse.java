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
 * DTO RESPONSE: CHI TIẾT ĐẦY ĐỦ CỦA CHỨNG TỪ GIAO DỊCH (UC048)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDetailResponse {

    private Long transactionId;
    private Long userId;
    private Long originalTransactionId;
    private Long subscriptionId;
    private Long purchaseId;
    private Long campaignId;
    private TransactionType transactionType;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private String gatewayTransactionId;
    private String bankCode;
    private TransactionStatus status;
    private LocalDateTime paidAt;
    private LocalDateTime reconciledAt;
    private Long reconciledBy;
    private LocalDateTime createdAt;
    private Long targetId;

    /**
     * Chuyển đổi từ JPA Entity sang DTO chi tiết.
     */
    public static TransactionDetailResponse fromEntity(Transaction tx) {
        if (tx == null) return null;
        return TransactionDetailResponse.builder()
                .transactionId(tx.getTransactionId())
                .userId(tx.getUserId())
                .originalTransactionId(tx.getOriginalTransactionId())
                .subscriptionId(tx.getSubscriptionId())
                .purchaseId(tx.getPurchaseId())
                .campaignId(tx.getCampaignId())
                .transactionType(tx.getTransactionType())
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .paymentMethod(tx.getPaymentMethod())
                .gatewayTransactionId(tx.getGatewayTransactionId())
                .bankCode(tx.getBankCode())
                .status(tx.getStatus())
                .paidAt(tx.getPaidAt())
                .reconciledAt(tx.getReconciledAt())
                .reconciledBy(tx.getReconciledBy())
                .createdAt(tx.getCreatedAt())
                .targetId(tx.resolveTargetId())
                .build();
    }
}
