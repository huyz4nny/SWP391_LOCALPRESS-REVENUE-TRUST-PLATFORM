package com.localpress.finance.service;

import com.localpress.finance.dto.response.FinancialDocumentResponse;
import com.localpress.finance.model.FinancialDocument;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.FinancialDocumentRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * ==============================================================================
 * CHỨNG TỪ TÀI CHÍNH (SV4 - UC057)
 * ==============================================================================
 * - issueFor: gọi trong cùng giao dịch lúc đơn chuyển SUCCESS (PaymentProcessingService.processSepayIpn,
 *   nơi duy nhất ghi tiền vào đơn cho webhook, đồng bộ API, khiếu nại và đối soát). Đã có chứng từ thì trả lại
 *   chứng từ cũ (Rule 5).
 * - voidFor: hoàn tiền toàn phần thì hủy chứng từ (RefundManagementService.reviewRefund).
 * - Giá đơn đã gồm VAT: tách trước thuế = tổng / (1 + thuế suất), làm tròn đến đồng, thuế = tổng - trước thuế.
 * - Thông tin người mua đọc bảng users / advertisers (chỉ đọc, Rule 17) và lưu lại lúc phát hành.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FinancialDocumentService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final FinancialDocumentRepository documentRepository;
    private final TransactionRepository transactionRepository;
    private final JdbcTemplate jdbcTemplate;

    /** Thuế suất GTGT (%). 8% theo NQ 204/2025/QH15 đến 31/12/2026, từ 2027 đổi về 10% trong cấu hình. */
    @Value("${localpress.finance.vat-rate:8}")
    private BigDecimal vatRate = BigDecimal.valueOf(8);

    // =========================================================================
    // PHÁT HÀNH / HỦY
    // =========================================================================

    @Transactional
    public FinancialDocument issueFor(Transaction tx) {
        if (tx.getTransactionType() == null || !tx.getTransactionType().isPurchase()) {
            throw new IllegalArgumentException("Chỉ phát hành chứng từ cho đơn mua, không cho " + tx.getTransactionType());
        }
        Optional<FinancialDocument> existing = documentRepository.findByTransactionId(tx.getTransactionId());
        if (existing.isPresent()) {
            return existing.get();
        }

        LocalDateTime issuedAt = tx.getPaidAt() != null ? tx.getPaidAt() : LocalDateTime.now();
        FinancialDocument.Type type = tx.getTransactionType() == TransactionType.AD
                ? FinancialDocument.Type.INVOICE
                : FinancialDocument.Type.RECEIPT;
        Buyer buyer = type == FinancialDocument.Type.INVOICE ? advertiserBuyer(tx.getUserId()) : readerBuyer(tx.getUserId());

        BigDecimal total = tx.getAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal rate = vatRate.setScale(2, RoundingMode.HALF_UP);
        BigDecimal beforeVat = splitBeforeVat(total, rate);

        FinancialDocument saved = documentRepository.save(FinancialDocument.builder()
                .documentNo(nextNumber(type, issuedAt.getYear()))
                .documentType(type)
                .transactionId(tx.getTransactionId())
                .userId(tx.getUserId())
                .buyerName(buyer.name())
                .buyerTaxCode(buyer.taxCode())
                .buyerAddress(buyer.address())
                .vatRate(rate)
                .amountBeforeVat(beforeVat)
                .vatAmount(total.subtract(beforeVat))
                .totalAmount(total)
                .status(FinancialDocument.Status.ISSUED)
                .issuedAt(issuedAt)
                .build());
        log.info("Phát hành chứng từ {} cho đơn #{} ({} đ, VAT {}%)",
                saved.getDocumentNo(), tx.getTransactionId(), total, rate);
        return saved;
    }

    /** Hoàn tiền toàn phần: hủy chứng từ của đơn gốc (đơn cũ trước UC057 không có chứng từ thì bỏ qua). */
    @Transactional
    public void voidFor(Long transactionId, LocalDateTime when) {
        documentRepository.findByTransactionId(transactionId).ifPresent(doc -> {
            if (doc.getStatus() == FinancialDocument.Status.VOIDED) return;
            doc.voidAt(when);
            documentRepository.save(doc);
            log.info("Hủy chứng từ {} vì đơn #{} đã hoàn tiền toàn phần", doc.getDocumentNo(), transactionId);
        });
    }

    /** Trước thuế = tổng * 100 / (100 + thuế suất), làm tròn đến đồng. */
    static BigDecimal splitBeforeVat(BigDecimal total, BigDecimal ratePercent) {
        return total.multiply(HUNDRED)
                .divide(HUNDRED.add(ratePercent), 0, RoundingMode.HALF_UP)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private String nextNumber(FinancialDocument.Type type, int year) {
        documentRepository.bumpSequence(type.name(), year);
        Number no = documentRepository.currentSequence(type.name(), year);
        if (no == null) {
            throw new IllegalStateException("Không cấp được số chứng từ " + type + " năm " + year);
        }
        return String.format("%s-%d-%06d", type == FinancialDocument.Type.INVOICE ? "HD" : "BN", year, no.longValue());
    }

    // =========================================================================
    // TRA CỨU
    // =========================================================================

    /** Chứng từ của chính user (GET /finance/documents/mine), mới nhất trước. */
    @Transactional(readOnly = true)
    public List<FinancialDocumentResponse> getMine(Long userId, String type) {
        List<FinancialDocument> docs;
        if (type == null || type.isBlank()) {
            docs = documentRepository.findByUserIdOrderByIssuedAtDescDocumentIdDesc(userId);
        } else {
            docs = documentRepository.findByUserIdAndDocumentTypeOrderByIssuedAtDescDocumentIdDesc(userId, parseType(type));
        }
        return toResponses(docs);
    }

    /** Chứng từ của 1 đơn: chủ đơn hoặc nhân sự tài chính (Rule 14). Đơn chưa thu thì 404. */
    @Transactional(readOnly = true)
    public FinancialDocumentResponse getForTransaction(FinanceCurrentUser.Principal principal, Long transactionId) {
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng #" + transactionId, HttpStatus.NOT_FOUND));
        principal.assertCanAccess(tx.getUserId());
        FinancialDocument doc = documentRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new AppException("Đơn #" + transactionId + " chưa có chứng từ (chưa thu tiền)", HttpStatus.NOT_FOUND));
        return toResponse(doc, tx);
    }

    private List<FinancialDocumentResponse> toResponses(List<FinancialDocument> docs) {
        if (docs.isEmpty()) return List.of();
        Map<Long, Transaction> txs = transactionRepository
                .findAllById(docs.stream().map(FinancialDocument::getTransactionId).toList())
                .stream()
                .collect(Collectors.toMap(Transaction::getTransactionId, Function.identity()));
        return docs.stream().map(d -> toResponse(d, txs.get(d.getTransactionId()))).toList();
    }

    private static FinancialDocumentResponse toResponse(FinancialDocument d, Transaction tx) {
        return FinancialDocumentResponse.builder()
                .documentNo(d.getDocumentNo())
                .type(d.getDocumentType().name())
                .orderCode(tx != null ? tx.getGatewayTransactionId() : null)
                .targetType(tx != null ? frontendOrderType(tx.getTransactionType()) : null)
                .targetId(tx != null && tx.resolveTargetId() != null ? String.valueOf(tx.resolveTargetId()) : null)
                .description(tx != null ? tx.getDescription() : null)
                .buyerName(d.getBuyerName())
                .buyerTaxCode(d.getBuyerTaxCode())
                .buyerAddress(d.getBuyerAddress())
                .vatRate(d.getVatRate())
                .amountBeforeVat(d.getAmountBeforeVat())
                .vatAmount(d.getVatAmount())
                .totalAmount(d.getTotalAmount())
                .status(d.getStatus().name())
                .issuedAt(d.getIssuedAt())
                .voidedAt(d.getVoidedAt())
                .build();
    }

    private static String frontendOrderType(TransactionType type) {
        return switch (type) {
            case AD -> "AD_CAMPAIGN";
            case ARTICLE -> "ARTICLE_PURCHASE";
            case SUBSCRIPTION -> "SUBSCRIPTION";
            case REFUND -> "REFUND";
        };
    }

    private static FinancialDocument.Type parseType(String type) {
        try {
            return FinancialDocument.Type.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException("Loại chứng từ không hợp lệ: " + type + " (RECEIPT hoặc INVOICE)", HttpStatus.BAD_REQUEST);
        }
    }

    // =========================================================================
    // NGƯỜI MUA (chỉ đọc bảng của module khác)
    // =========================================================================

    record Buyer(String name, String taxCode, String address) {}

    /** Doanh nghiệp: ưu tiên thông tin xuất hóa đơn, thiếu thì lấy hồ sơ công ty. */
    private Buyer advertiserBuyer(Long userId) {
        List<Buyer> rows = jdbcTemplate.query("""
                        SELECT COALESCE(NULLIF(a.invoice_name, ''), a.company_name) AS name,
                               COALESCE(NULLIF(a.invoice_tax_code, ''), a.tax_code) AS tax_code,
                               COALESCE(NULLIF(a.invoice_address, ''), a.address) AS address
                        FROM advertisers a WHERE a.user_id = ?
                        """,
                (rs, i) -> new Buyer(rs.getString("name"), rs.getString("tax_code"), rs.getString("address")),
                userId);
        return rows.isEmpty() ? readerBuyer(userId) : rows.get(0);
    }

    private Buyer readerBuyer(Long userId) {
        List<String> names = jdbcTemplate.query("SELECT full_name FROM users WHERE user_id = ?",
                (rs, i) -> rs.getString("full_name"), userId);
        String name = names.isEmpty() || names.get(0) == null || names.get(0).isBlank()
                ? "Khách hàng #" + userId
                : names.get(0);
        return new Buyer(name, null, null);
    }
}
