package com.localpress.finance.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * ENTITY: CHỨNG TỪ TÀI CHÍNH (SV4 - UC057)
 * ==============================================================================
 * Hệ thống tự phát hành đúng 1 chứng từ cho mỗi đơn khi đơn chuyển SUCCESS (UNIQUE transaction_id):
 * đơn quảng cáo -> INVOICE (HD-yyyy-nnnnnn), đơn độc giả -> RECEIPT (BN-yyyy-nnnnnn).
 * Thông tin người mua và thuế suất chụp lại lúc phát hành; về sau không sửa, chỉ VOIDED khi hoàn toàn phần.
 */
@Entity
@Table(name = "financial_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinancialDocument {

    public enum Type { RECEIPT, INVOICE }

    public enum Status { ISSUED, VOIDED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "document_no", nullable = false, unique = true, length = 30)
    private String documentNo;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private Type documentType;

    /** Đơn được phát hành chứng từ (Scalar FK tới transactions). */
    @Column(name = "transaction_id", nullable = false, unique = true)
    private Long transactionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "buyer_name", nullable = false, length = 255)
    private String buyerName;

    @Column(name = "buyer_tax_code", length = 50)
    private String buyerTaxCode;

    @Column(name = "buyer_address", length = 500)
    private String buyerAddress;

    /** Thuế suất GTGT (%) lúc phát hành. */
    @Column(name = "vat_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal vatRate;

    @Column(name = "amount_before_vat", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountBeforeVat;

    @Column(name = "vat_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal vatAmount;

    /** Số khách đã trả (giá đơn đã gồm VAT). */
    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.ISSUED;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "voided_at")
    private LocalDateTime voidedAt;

    /** Hoàn tiền toàn phần: hủy chứng từ, gọi lại không đổi gì. */
    public void voidAt(LocalDateTime when) {
        if (this.status == Status.VOIDED) {
            return;
        }
        this.status = Status.VOIDED;
        this.voidedAt = when;
    }
}
