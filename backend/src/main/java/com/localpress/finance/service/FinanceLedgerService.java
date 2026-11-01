package com.localpress.finance.service;

import com.localpress.finance.dto.request.LedgerFilterRequest;
import com.localpress.finance.dto.response.FinanceDashboardResponse;
import com.localpress.finance.dto.response.LedgerSummaryResponse;
import com.localpress.finance.dto.response.TransactionDetailResponse;
import com.localpress.finance.dto.response.TransactionLedgerResponse;
import com.localpress.finance.model.PaymentComplaint;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.RefundStatus;
import com.localpress.finance.repository.PaymentComplaintRepository;
import com.localpress.finance.repository.RefundRequestRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

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
    private final RefundRequestRepository refundRequestRepository;
    private final PaymentComplaintRepository paymentComplaintRepository;
    private final FinanceReconciliationService reconciliationService;
    private final JdbcTemplate jdbcTemplate;

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

        Page<TransactionLedgerResponse> result = transactionRepository.searchLedger(
                filter.getStatus(),
                filter.getTransactionType(),
                trimToNull(filter.getPaymentMethod()),
                filter.getFromDate(),
                filter.getToDate(),
                trimToNull(filter.getKeyword()),
                pageable
        ).map(TransactionLedgerResponse::fromEntity);
        attachCustomers(result.getContent());
        return result;
    }

    /**
     * UC048: Tra cứu chi tiết một chứng từ giao dịch theo ID.
     *
     * @param transactionId Mã giao dịch cần tra cứu.
     * @return TransactionDetailResponse đầy đủ.
     */
    public TransactionDetailResponse getTransactionDetail(Long transactionId) {
        log.info("Xem chi tiết chứng từ giao dịch ID: {}", transactionId);

        TransactionDetailResponse detail = transactionRepository.findById(transactionId)
                .map(TransactionDetailResponse::fromEntity)
                .orElseThrow(() -> new AppException("Không tìm thấy chứng từ giao dịch #" + transactionId, HttpStatus.NOT_FOUND));
        String[] customer = customersOf(List.of(detail.getUserId())).get(detail.getUserId());
        if (customer != null) {
            detail.setUserName(customer[0]);
            detail.setUserEmail(customer[1]);
        }
        return detail;
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

        return LedgerSummaryResponse.builder()
                .totalGrossRevenue(grossRevenue)
                .totalRefundedAmount(refundedAmount)
                .netRevenue(grossRevenue.subtract(refundedAmount))
                .pendingCount(transactionRepository.countByStatus(TransactionStatus.PENDING))
                .successCount(transactionRepository.countByStatus(TransactionStatus.SUCCESS))
                .failedCount(transactionRepository.countByStatus(TransactionStatus.FAILED))
                .build();
    }

    /** Gắn tên và email thật của khách vào từng dòng (1 câu SELECT cho cả trang). */
    private void attachCustomers(List<TransactionLedgerResponse> rows) {
        Map<Long, String[]> customers = customersOf(rows.stream().map(TransactionLedgerResponse::getUserId).toList());
        for (TransactionLedgerResponse row : rows) {
            String[] customer = customers.get(row.getUserId());
            if (customer != null) {
                row.setUserName(customer[0]);
                row.setUserEmail(customer[1]);
            }
        }
    }

    /** user_id -> {full_name, email}; bảng users của identity chỉ đọc, không ghi. */
    private Map<Long, String[]> customersOf(List<Long> userIds) {
        List<Long> ids = userIds.stream().filter(Objects::nonNull).distinct().toList();
        Map<Long, String[]> result = new HashMap<>();
        if (ids.isEmpty()) return result;
        String in = ids.stream().map(id -> "?").collect(Collectors.joining(","));
        jdbcTemplate.query("SELECT user_id, full_name, email FROM users WHERE user_id IN (" + in + ")",
                rs -> { result.put(rs.getLong(1), new String[]{rs.getString(2), rs.getString(3)}); }, ids.toArray());
        return result;
    }

    /**
     * Lấy dữ liệu tổng quan cho trang Dashboard tài chính (FinanceDashboard.tsx).
     * Không readOnly: mở dashboard thì quét khoản lệch đối soát tháng hiện tại (UC054) để số liệu luôn mới.
     */
    @Transactional
    public FinanceDashboardResponse getFinanceDashboard() {
        log.info("Lấy dữ liệu tổng quan Dashboard tài chính");

        // "Doanh thu thực thu" = doanh thu thuần, cùng công thức với sổ quỹ (Rule 16): gộp - tiền đã hoàn
        BigDecimal netRevenue = transactionRepository.calculateTotalGrossRevenue()
                .subtract(transactionRepository.calculateTotalRefundedAmount());
        List<TransactionLedgerResponse> recentTransactions = transactionRepository
                .findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(TransactionLedgerResponse::fromEntity)
                .getContent();
        attachCustomers(recentTransactions);

        return FinanceDashboardResponse.builder()
                .totalRevenue(netRevenue)
                .paidOrdersCount(transactionRepository.countByStatus(TransactionStatus.SUCCESS))
                .pendingOrdersCount(transactionRepository.countByStatus(TransactionStatus.PENDING))
                .refundReviewCount(refundRequestRepository.countByStatus(RefundStatus.PENDING))
                .openComplaintCount(paymentComplaintRepository.countByStatus(PaymentComplaint.Status.OPEN))
                .reconciliationDiscrepancy(reconciliationService.currentUnresolvedAmount())
                .recentOrders(recentTransactions)
                .build();
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

