package com.localpress.finance.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * ENTITY: NHẬT KÝ WEBHOOK / GIAO DỊCH SEPAY (SV4 - UC048, UC049)
 * ==============================================================================
 * Mỗi lần SePay báo có tiền (webhook), mỗi giao dịch kéo về qua API SePay, và mỗi lần bấm nút
 * giả lập đều ghi 1 dòng kèm payload thô. sepay_id UNIQUE: cùng 1 giao dịch SePay không xử lý 2 lần.
 */
@Entity
@Table(name = "sepay_webhook_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SepayWebhookLog {

    public enum Source { WEBHOOK, API_SYNC, SIMULATION }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private Source source;

    /** Id giao dịch phía SePay. Null với bản giả lập. */
    @Column(name = "sepay_id", unique = true)
    private Long sepayId;

    @Column(name = "auth_ok", nullable = false)
    @Builder.Default
    private boolean authOk = true;

    @Column(name = "gateway", length = 100)
    private String gateway;

    @Column(name = "account_number", length = 50)
    private String accountNumber;

    @Column(name = "transfer_type", length = 10)
    private String transferType;

    @Column(name = "transfer_amount", precision = 14, scale = 2)
    private BigDecimal transferAmount;

    @Column(name = "content", length = 500)
    private String content;

    @Column(name = "payment_code", length = 100)
    private String paymentCode;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    @Column(name = "transaction_date", length = 30)
    private String transactionDate;

    /** Mã đơn LocalPress tìm được trong nội dung chuyển khoản. */
    @Column(name = "order_code", length = 255)
    private String orderCode;

    /** SUCCESS, ALREADY_PROCESSED, ORDER_NOT_FOUND, UNDERPAID_CREDITED_TO_WALLET, INVALID_SIGNATURE, IGNORED_OUTGOING... */
    @Column(name = "result_status", nullable = false, length = 50)
    private String resultStatus;

    @Column(name = "result_message", length = 500)
    private String resultMessage;

    @Column(name = "raw_payload", columnDefinition = "TEXT")
    private String rawPayload;

    @Column(name = "remote_ip", length = 64)
    private String remoteIp;

    @Column(name = "received_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime receivedAt = LocalDateTime.now();
}
