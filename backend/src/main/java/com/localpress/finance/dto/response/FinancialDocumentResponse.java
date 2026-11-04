package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * UC057: một chứng từ đã phát hành (bảng financial_documents) kèm mã đơn để hiển thị.
 * Khớp type FinancialDocument ở frontend (features/finance/types).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialDocumentResponse {
    private String documentNo;
    /** RECEIPT | INVOICE */
    private String type;
    private String orderCode;
    /** Loại đơn theo frontend: AD_CAMPAIGN | ARTICLE_PURCHASE | SUBSCRIPTION */
    private String targetType;
    private String targetId;
    private String description;
    private String buyerName;
    private String buyerTaxCode;
    private String buyerAddress;
    private BigDecimal vatRate;
    private BigDecimal amountBeforeVat;
    private BigDecimal vatAmount;
    private BigDecimal totalAmount;
    /** ISSUED | VOIDED */
    private String status;
    private LocalDateTime issuedAt;
    private LocalDateTime voidedAt;
}
