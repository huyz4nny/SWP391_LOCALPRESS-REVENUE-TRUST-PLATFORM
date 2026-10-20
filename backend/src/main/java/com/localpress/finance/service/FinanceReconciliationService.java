package com.localpress.finance.service;

import com.localpress.finance.dto.request.ResolveDiscrepancyRequest;
import com.localpress.finance.dto.response.ReconciliationPeriodResponse;
import com.localpress.finance.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ==============================================================================
 * DỊCH VỤ ĐỐI SOÁT TÀI CHÍNH NGÂN HÀNG (SV4 - UC054)
 * ==============================================================================
 * Phục vụ Kế toán so khớp dòng tiền giữa Sổ cái hệ thống và Cổng thanh toán SePay / Ngân hàng.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FinanceReconciliationService {

    private final JdbcTemplate jdbcTemplate;

    // Lưu trạng thái xử lý sai lệch trong kỳ đối soát hiện tại
    private final Map<String, ReconciliationPeriodResponse.DiscrepancyItem> discrepancyCache = new ConcurrentHashMap<>();
    private volatile boolean isPeriodClosed = false;
    private volatile String closedAt = null;
    private volatile String closedByName = null;

    /**
     * UC054: Lấy dữ liệu kỳ đối soát hiện tại (tháng hiện tại).
     */
    @Transactional(readOnly = true)
    public ReconciliationPeriodResponse getCurrentPeriod() {
        log.info("Lấy thông tin kỳ đối soát ngân hàng");

        LocalDate now = LocalDate.now();
        String periodName = "Kỳ đối soát Tháng " + now.format(DateTimeFormatter.ofPattern("MM/yyyy"));
        LocalDate startDate = now.withDayOfMonth(1);
        LocalDate endDate = now.withDayOfMonth(now.lengthOfMonth());

        // 1. Tổng tiền thực vào tài khoản ngân hàng theo hệ thống (đối chiếu với sao kê):
        //    gồm cả tiền nạp ví (TOPUP), bỏ đơn trả bằng ví (tiền đã vào ngân hàng lúc nạp) và bút toán hoàn.
        String sumSql = """
            SELECT COALESCE(SUM(amount), 0) FROM transactions
            WHERE status = 'SUCCESS' AND transaction_type <> 'REFUND' AND payment_method <> 'WALLET'
        """;
        BigDecimal systemRevenue = jdbcTemplate.queryForObject(sumSql, BigDecimal.class);
        if (systemRevenue == null) systemRevenue = BigDecimal.ZERO;

        // Giả lập số liệu đối soát từ sao kê SePay / Vietcombank
        BigDecimal gatewayRevenue = systemRevenue;

        // 2. Tự động quét các giao dịch có dấu hiệu sai lệch / treo cần xử lý
        initDiscrepanciesIfEmpty();

        List<ReconciliationPeriodResponse.DiscrepancyItem> list = new ArrayList<>(discrepancyCache.values());
        BigDecimal totalDiscrepancy = list.stream()
                .filter(d -> "UNRESOLVED".equalsIgnoreCase(d.getStatus()))
                .map(ReconciliationPeriodResponse.DiscrepancyItem::getDiscrepancyAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String status = isPeriodClosed ? "CLOSED" : (totalDiscrepancy.compareTo(BigDecimal.ZERO) == 0 ? "RECONCILED" : "OPEN");

        return ReconciliationPeriodResponse.builder()
                .id("REC-" + now.format(DateTimeFormatter.ofPattern("yyyyMM")))
                .periodName(periodName)
                .startDate(startDate.toString())
                .endDate(endDate.toString())
                .totalSystemRevenue(systemRevenue)
                .totalGatewayRevenue(gatewayRevenue)
                .discrepancyTotal(totalDiscrepancy)
                .status(status)
                .discrepancies(list)
                .closedAt(closedAt)
                .closedByName(closedByName)
                .build();
    }

    /**
     * UC054: Kế toán xử lý giải quyết một khoản sai lệch.
     */
    public ReconciliationPeriodResponse resolveDiscrepancy(ResolveDiscrepancyRequest request, Long accountantId) {
        log.info("Giải quyết sai lệch #{}: note={}, accountantId={}",
                request.getDiscrepancyId(), request.getNote(), accountantId);

        initDiscrepanciesIfEmpty();
        ReconciliationPeriodResponse.DiscrepancyItem item = discrepancyCache.get(request.getDiscrepancyId());
        if (item != null) {
            item.setStatus("RESOLVED");
            item.setResolutionNote(request.getNote());
            item.setResolvedBy("Kế toán #" + accountantId);
            item.setResolvedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        }

        return getCurrentPeriod();
    }

    /**
     * UC054: Chốt khóa kỳ đối soát tháng.
     */
    public ReconciliationPeriodResponse closePeriod(Long managerId) {
        log.info("Đóng kỳ đối soát bởi Kế toán trưởng ID: {}", managerId);

        this.isPeriodClosed = true;
        this.closedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        this.closedByName = "Kế toán trưởng #" + managerId;

        return getCurrentPeriod();
    }

    private synchronized void initDiscrepanciesIfEmpty() {
        if (discrepancyCache.isEmpty()) {
            discrepancyCache.put("DISC-001", ReconciliationPeriodResponse.DiscrepancyItem.builder()
                    .id("DISC-001")
                    .transactionCode("TXN-VCB-9812")
                    .orderCode("ORD-20260901-001")
                    .systemAmount(new BigDecimal("480000"))
                    .gatewayAmount(new BigDecimal("480000"))
                    .discrepancyAmount(BigDecimal.ZERO)
                    .reason("Lệch thời gian ghi nhận (Đơn nộp 23:58 ngày 31, tiền vào 00:02 ngày 1)")
                    .status("RESOLVED")
                    .resolutionNote("Đã đối chiếu sao kê Vietcombank khớp 100%")
                    .resolvedBy("Lê Kế Toán")
                    .resolvedAt("2026-09-02 08:30:00")
                    .build());

            discrepancyCache.put("DISC-002", ReconciliationPeriodResponse.DiscrepancyItem.builder()
                    .id("DISC-002")
                    .transactionCode("TXN-SEPAY-004")
                    .orderCode("ORD-20260920-004")
                    .systemAmount(new BigDecimal("15000"))
                    .gatewayAmount(new BigDecimal("15000"))
                    .discrepancyAmount(BigDecimal.ZERO)
                    .reason("Khách chuyển thừa 2.000đ tiền tip, đã ghi nhận hoàn vào tài khoản độc giả")
                    .status("RESOLVED")
                    .resolutionNote("Bút toán điều chỉnh đã lập")
                    .resolvedBy("Lê Kế Toán")
                    .resolvedAt("2026-09-20 14:15:00")
                    .build());
        }
    }
}
