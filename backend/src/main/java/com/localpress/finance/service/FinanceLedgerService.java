package com.localpress.finance.service;

import com.localpress.finance.dto.request.LedgerFilterRequest;
import com.localpress.finance.dto.response.LedgerSummaryResponse;
import com.localpress.finance.dto.response.TransactionDetailResponse;
import com.localpress.finance.dto.response.TransactionLedgerResponse;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * ==============================================================================
 * SERVICE: QUẢN LÝ SỔ QUỸ & CHỨNG TỪ TÀI CHÍNH (UC047, UC048, UC049)
 * ==============================================================================
 * - Phân hệ: com.localpress.finance (SV4 - Huy)
 * - Màn hình tương ứng: II.4.1 Financial Documents and Ledger
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FinanceLedgerService {

    private final TransactionRepository transactionRepository;

    /**
     * Danh sách phương thức thanh toán chuyển khoản thủ công.
     */
    private static final List<String> MANUAL_PAYMENT_METHODS = List.of(
            "BANK_TRANSFER",
            "MANUAL_BANK_TRANSFER"
    );

    /**
     * UC047: Tra cứu danh sách chứng từ & sổ quỹ theo các tiêu chí lọc.
     *
     * @param filter Bộ lọc theo trạng thái, loại hình, phương thức, thời gian, từ khóa.
     * @return Trang danh sách TransactionLedgerResponse.
     */
    public Page<TransactionLedgerResponse> getLedgerEntries(LedgerFilterRequest filter) {
        log.info("Tra cứu sổ quỹ tài chính với bộ lọc: {}", filter);

        int page = Math.max(0, filter.getPage());
        int size = filter.getSize() <= 0 ? 20 : Math.min(filter.getSize(), 100);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        String keyword = (filter.getKeyword() != null && !filter.getKeyword().isBlank())
                ? filter.getKeyword().trim()
                : null;

        String paymentMethod = (filter.getPaymentMethod() != null && !filter.getPaymentMethod().isBlank())
                ? filter.getPaymentMethod().trim()
                : null;

        Page<Transaction> pageResult = transactionRepository.searchLedger(
                filter.getStatus(),
                filter.getTransactionType(),
                paymentMethod,
                filter.getFromDate(),
                filter.getToDate(),
                keyword,
                pageable
        );

        return pageResult.map(TransactionLedgerResponse::fromEntity);
    }

    /**
     * UC048: Tra cứu chi tiết một chứng từ giao dịch theo ID.
     *
     * @param transactionId Mã giao dịch cần tra cứu.
     * @return TransactionDetailResponse đầy đủ.
     */
    public TransactionDetailResponse getTransactionDetail(Long transactionId) {
        log.info("Xem chi tiết chứng từ giao dịch ID: {}", transactionId);

        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy chứng từ giao dịch #" + transactionId,
                        HttpStatus.NOT_FOUND
                ));

        return TransactionDetailResponse.fromEntity(tx);
    }

    /**
     * UC049: Tổng hợp số liệu tổng quan sổ quỹ tài chính tòa soạn.
     *
     * @return LedgerSummaryResponse chứa tổng thu, tiền hoàn, doanh thu thuần và số lượng đơn.
     */
    public LedgerSummaryResponse getLedgerSummary() {
        log.info("Tổng hợp số liệu sổ quỹ tài chính tòa soạn");

        BigDecimal grossRevenue = transactionRepository.calculateTotalGrossRevenue();
        BigDecimal refundedAmount = transactionRepository.calculateTotalRefundedAmount();
        BigDecimal netRevenue = grossRevenue.subtract(refundedAmount);

        long pendingCount = transactionRepository.countByStatus(TransactionStatus.PENDING);
        long successCount = transactionRepository.countByStatus(TransactionStatus.SUCCESS);
        long failedCount = transactionRepository.countByStatus(TransactionStatus.FAILED);
        long pendingManualTransfersCount = transactionRepository.countByStatusAndPaymentMethodIn(
                TransactionStatus.PENDING,
                MANUAL_PAYMENT_METHODS
        );

        return LedgerSummaryResponse.builder()
                .totalGrossRevenue(grossRevenue)
                .totalRefundedAmount(refundedAmount)
                .netRevenue(netRevenue)
                .pendingCount(pendingCount)
                .successCount(successCount)
                .failedCount(failedCount)
                .pendingManualTransfersCount(pendingManualTransfersCount)
                .build();
    }

    /**
     * Lấy dữ liệu tổng quan cho trang Dashboard tài chính (FinanceDashboard.tsx).
     */
    public com.localpress.finance.dto.response.FinanceDashboardResponse getFinanceDashboard() {
        log.info("Lấy dữ liệu tổng quan Dashboard tài chính");

        BigDecimal grossRevenue = transactionRepository.calculateTotalGrossRevenue();
        long successCount = transactionRepository.countByStatus(TransactionStatus.SUCCESS);
        long pendingCount = transactionRepository.countByStatus(TransactionStatus.PENDING);

        List<TransactionLedgerResponse> recentTransactions = transactionRepository
                .findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(TransactionLedgerResponse::fromEntity)
                .getContent();

        return com.localpress.finance.dto.response.FinanceDashboardResponse.builder()
                .totalRevenue(grossRevenue)
                .paidOrdersCount(successCount)
                .pendingOrdersCount(pendingCount)
                .refundReviewCount(1L)
                .reconciliationDiscrepancy(BigDecimal.ZERO)
                .recentOrders(recentTransactions)
                .build();
    }
}

