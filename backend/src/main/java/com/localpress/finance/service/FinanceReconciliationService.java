package com.localpress.finance.service;

import com.localpress.finance.dto.request.ResolveDiscrepancyRequest;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.ReconciliationPeriodResponse;
import com.localpress.finance.model.PaymentComplaint;
import com.localpress.finance.model.ReconciliationItem;
import com.localpress.finance.model.ReconciliationPeriod;
import com.localpress.finance.model.SepayWebhookLog;
import com.localpress.finance.repository.PaymentComplaintRepository;
import com.localpress.finance.repository.ReconciliationItemRepository;
import com.localpress.finance.repository.ReconciliationPeriodRepository;
import com.localpress.finance.repository.SepayWebhookLogRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * ==============================================================================
 * DỊCH VỤ ĐỐI SOÁT KỲ (SV4 - UC054)
 * ==============================================================================
 * "Sao kê" là tiền SePay báo về tài khoản ngân hàng (sepay_webhook_logs: webhook + đồng bộ API + giả lập dev),
 * "hệ thống" là tiền đã ghi vào đơn / ví từ ngân hàng (transactions SUCCESS / REFUNDED, không trả bằng ví).
 * Mở kỳ thì quét và lưu các khoản lệch vào reconciliation_items (không còn dữ liệu mẫu trong bộ nhớ):
 *  - BANK_NOT_RECORDED     : ngân hàng có tiền, hệ thống chưa ghi (ORDER_NOT_FOUND, AMOUNT_MISSING,
 *                            chuyển thêm vào đơn đã trả). Xử lý: gán đơn / cộng ví / giải trình.
 *  - RECORDED_WITHOUT_BANK : kế toán ghi nhận theo khiếu nại nhưng SePay chưa báo khoản đó. Xử lý: giải trình
 *                            sau khi đối chiếu sao kê thật (sai thì lập hoàn tiền ở UC055).
 * Gán đơn / cộng ví đi qua đúng hàm của webhook (processSepayIpn / creditUnmatchedTransfer) nên giữ Rule 5.
 * Kế toán trưởng chốt kỳ: lưu ảnh chụp số liệu, khóa mọi xử lý trong kỳ.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FinanceReconciliationService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /** Kết quả xử lý webhook cho biết tiền đã về ngân hàng nhưng chưa ghi vào đâu. */
    private static final List<String> NOT_RECORDED_STATUSES = List.of("ORDER_NOT_FOUND", "ALREADY_PROCESSED", "AMOUNT_MISSING");

    /** Không phải tiền khách vào tài khoản (gửi lại, sai khóa, tiền ra, lỗi sẽ được SePay gửi lại). */
    private static final List<String> NOT_BANK_MONEY_STATUSES =
            List.of("DUPLICATE_DELIVERY", "INVALID_SIGNATURE", "IGNORED_OUTGOING", "ERROR");

    private static final Set<ReconciliationItem.Action> MONEY_ACTIONS =
            EnumSet.of(ReconciliationItem.Action.ASSIGN_ORDER, ReconciliationItem.Action.CREDIT_WALLET);

    private final JdbcTemplate jdbcTemplate;
    private final ReconciliationPeriodRepository periodRepository;
    private final ReconciliationItemRepository itemRepository;
    private final SepayWebhookLogRepository sepayLogRepository;
    private final PaymentComplaintRepository complaintRepository;
    private final TransactionRepository transactionRepository;
    private final PaymentProcessingService paymentProcessingService;

    // =========================================================================
    // XEM KỲ
    // =========================================================================

    /** UC054: Kỳ đối soát tháng hiện tại. */
    @Transactional
    public ReconciliationPeriodResponse getCurrentPeriod() {
        return getPeriod(null);
    }

    /** UC054: Kỳ đối soát theo tháng (yyyy-MM). Kỳ còn mở thì quét bổ sung khoản lệch mới trước khi trả về. */
    @Transactional
    public ReconciliationPeriodResponse getPeriod(String month) {
        YearMonth ym = parseMonth(month);
        ReconciliationPeriod period = findOrCreate(ym);
        if (!period.isClosed()) {
            scanDiscrepancies(period, ym);
        }
        return toResponse(period, ym);
    }

    /** Dashboard / cảnh báo: quét kỳ tháng hiện tại rồi trả tổng tiền + số khoản lệch còn mở. */
    @Transactional
    public BigDecimal currentUnresolvedAmount() {
        return getCurrentPeriod().getDiscrepancyTotal();
    }

    @Transactional
    public int currentUnresolvedCount() {
        return getCurrentPeriod().getUnresolvedCount();
    }

    // =========================================================================
    // XỬ LÝ KHOẢN LỆCH
    // =========================================================================

    @Transactional
    public ReconciliationPeriodResponse resolveDiscrepancy(ResolveDiscrepancyRequest request, Long accountantId) {
        Long itemId = parseItemId(request.getDiscrepancyId());
        ReconciliationItem item = itemRepository.findByIdForUpdate(itemId)
                .orElseThrow(() -> new AppException("Không tìm thấy khoản lệch #" + itemId, HttpStatus.NOT_FOUND));
        ReconciliationPeriod period = periodRepository.findByIdForUpdate(item.getPeriodId())
                .orElseThrow(() -> new AppException("Không tìm thấy kỳ đối soát của khoản lệch #" + itemId, HttpStatus.NOT_FOUND));
        period.assertOpen();
        item.assertUnresolved();
        if (request.getNote() == null || request.getNote().isBlank()) {
            throw new AppException("Phải nhập ghi chú xử lý khoản lệch", HttpStatus.BAD_REQUEST);
        }

        ReconciliationItem.Action action = parseAction(request.getAction());
        if (item.getItemType() == ReconciliationItem.Type.RECORDED_WITHOUT_BANK && action != ReconciliationItem.Action.EXPLAINED) {
            throw new AppException("Khoản đã ghi nhận theo khiếu nại chỉ cần giải trình sau khi đối chiếu sao kê; "
                    + "nếu tiền không về thật, hãy lập đề xuất hoàn tiền (UC055)", HttpStatus.BAD_REQUEST);
        }

        String actionRef = null;
        String actionResult = action.name();
        if (action != ReconciliationItem.Action.EXPLAINED) {
            BigDecimal amount = item.getAmount().signum() > 0 ? item.getAmount() : request.getAmount();
            if (amount == null || amount.signum() <= 0) {
                throw new AppException("SePay không báo số tiền của khoản này, hãy nhập số tiền theo sao kê", HttpStatus.BAD_REQUEST);
            }
            assertReferenceNotRecorded(item);
            String reference = item.getReferenceCode() != null ? item.getReferenceCode() : "LOG" + item.getLogId();

            Map<String, Object> result;
            if (action == ReconciliationItem.Action.ASSIGN_ORDER) {
                String orderCode = trimUpper(request.getOrderCode());
                if (orderCode == null) {
                    throw new AppException("Gán vào đơn cần mã đơn hàng", HttpStatus.BAD_REQUEST);
                }
                actionRef = paymentProcessingService.resolvePaymentCode(orderCode, amount);
                result = paymentProcessingService.processSepayIpn(SepayIpnRequest.builder()
                        .content(actionRef).amount(amount).referenceCode(reference).build());
                String status = String.valueOf(result.get("status"));
                if ("ORDER_NOT_FOUND".equals(status)) {
                    throw new AppException("Không tìm thấy đơn hàng " + orderCode, HttpStatus.NOT_FOUND);
                }
                if ("ALREADY_PROCESSED".equals(status)) {
                    throw new AppException("Đơn " + orderCode + " đã được thanh toán, hãy chọn cộng vào ví khách", HttpStatus.CONFLICT);
                }
            } else {
                Long userId = resolveWalletOwner(request);
                actionRef = "REC-" + reference;
                result = paymentProcessingService.creditUnmatchedTransfer(userId, amount, actionRef,
                        "Đối soát kỳ " + period.getPeriodMonth() + ": cộng ví khoản lệch #" + item.getItemId());
                if ("ALREADY_PROCESSED".equals(result.get("status"))) {
                    throw new AppException("Khoản " + reference + " đã được cộng vào ví trước đó", HttpStatus.CONFLICT);
                }
                actionRef = actionRef + " (user #" + userId + ")";
            }
            actionResult = String.valueOf(result.get("status"));
            if (item.getAmount().signum() == 0) {
                item.setAmount(amount);
            }
        }

        item.resolve(accountantId, action, actionRef, actionResult, request.getNote());
        itemRepository.save(item);
        log.info("Kế toán #{} xử lý khoản lệch #{}: {} {} -> {}", accountantId, itemId, action, actionRef, actionResult);
        return toResponse(period, YearMonth.parse(period.getPeriodMonth()));
    }

    // =========================================================================
    // CHỐT KỲ
    // =========================================================================

    /** Giữ chữ ký cũ: chốt kỳ tháng hiện tại, chấp nhận còn khoản lệch. */
    @Transactional
    public ReconciliationPeriodResponse closePeriod(Long managerId) {
        return closePeriod(null, managerId, true, null);
    }

    /**
     * UC054: Kế toán trưởng chốt kỳ. Còn khoản lệch mà chưa xác nhận -> 409. Kỳ đã chốt -> 409.
     * Lưu ảnh chụp tổng ngân hàng / hệ thống / số khoản lệch còn mở tại thời điểm chốt.
     */
    @Transactional
    public ReconciliationPeriodResponse closePeriod(String month, Long managerId, boolean acknowledgeUnresolved, String note) {
        YearMonth ym = parseMonth(month);
        findOrCreate(ym);
        ReconciliationPeriod period = periodRepository.findByPeriodMonthForUpdate(ym.toString())
                .orElseThrow(() -> new AppException("Không tìm thấy kỳ " + ym, HttpStatus.NOT_FOUND));
        period.assertOpen();
        scanDiscrepancies(period, ym);

        List<ReconciliationItem> items = itemRepository.findByPeriodIdOrderByCreatedAtAsc(period.getPeriodId());
        int unresolved = (int) items.stream().filter(i -> i.getStatus() == ReconciliationItem.Status.UNRESOLVED).count();
        if (unresolved > 0 && !acknowledgeUnresolved) {
            throw new AppException("Còn " + unresolved + " khoản lệch chưa xử lý. Xác nhận chốt kỳ khi vẫn còn chênh lệch?",
                    HttpStatus.CONFLICT);
        }
        String trimmedNote = note == null || note.isBlank() ? null : note.trim();
        period.close(managerId, bankTotal(ym), systemTotal(ym), unresolved, trimmedNote);
        periodRepository.save(period);
        log.info("Kế toán trưởng #{} chốt kỳ {} (còn {} khoản lệch)", managerId, ym, unresolved);
        return toResponse(period, ym);
    }

    // =========================================================================
    // QUÉT KHOẢN LỆCH
    // =========================================================================

    private void scanDiscrepancies(ReconciliationPeriod period, YearMonth ym) {
        Timestamp from = Timestamp.valueOf(ym.atDay(1).atStartOfDay());
        Timestamp to = Timestamp.valueOf(ym.plusMonths(1).atDay(1).atStartOfDay());
        List<String> recordedStatuses = new ArrayList<>(SepayWebhookLog.MONEY_RECORDED_STATUSES);
        recordedStatuses.add(SepayWebhookLog.RECORDED_BY_COMPLAINT);

        // 1. Ngân hàng có tiền, hệ thống chưa ghi. Bỏ khoản mà cùng mã GD đã được ghi ở chỗ khác
        //    (webhook khác, khiếu nại, khoản lệch khác) để nút "bắn lại webhook" không sinh lệch giả.
        String bankSql = """
            SELECT l.log_id, l.reference_code, l.order_code, l.transfer_amount, l.result_status, l.source
            FROM sepay_webhook_logs l
            WHERE l.received_at >= ? AND l.received_at < ?
              AND l.auth_ok = TRUE
              AND (l.transfer_type IS NULL OR LOWER(l.transfer_type) <> 'out')
              AND l.result_status IN (%s)
              AND NOT EXISTS (SELECT 1 FROM reconciliation_items i WHERE i.log_id = l.log_id)
              AND (l.reference_code IS NULL OR (
                    NOT EXISTS (SELECT 1 FROM sepay_webhook_logs r
                                WHERE r.reference_code = l.reference_code AND r.result_status IN (%s))
                AND NOT EXISTS (SELECT 1 FROM payment_complaints c
                                WHERE c.bank_reference = l.reference_code AND c.status = 'RESOLVED')
                AND NOT EXISTS (SELECT 1 FROM reconciliation_items i2 WHERE i2.reference_code = l.reference_code)))
            ORDER BY l.received_at ASC, l.log_id ASC
            """.formatted(placeholders(NOT_RECORDED_STATUSES.size()), placeholders(recordedStatuses.size()));
        List<Object> args = new ArrayList<>(List.of(from, to));
        args.addAll(NOT_RECORDED_STATUSES);
        args.addAll(recordedStatuses);

        Set<String> seenReferences = new HashSet<>();
        jdbcTemplate.query(bankSql, rs -> {
            String reference = rs.getString("reference_code");
            if (reference != null && !seenReferences.add(reference)) return;
            BigDecimal amount = rs.getBigDecimal("transfer_amount");
            insertItem(ReconciliationItem.builder()
                    .periodId(period.getPeriodId())
                    .itemType(ReconciliationItem.Type.BANK_NOT_RECORDED)
                    .logId(rs.getLong("log_id"))
                    .referenceCode(reference)
                    .orderCode(rs.getString("order_code"))
                    .amount(amount != null && amount.signum() > 0 ? amount : BigDecimal.ZERO)
                    .reason(bankReason(rs.getString("result_status"), rs.getString("order_code"), rs.getString("source")))
                    .build());
        }, args.toArray());

        // 2. Kế toán đã ghi nhận theo khiếu nại nhưng SePay chưa từng báo khoản đó
        String complaintSql = """
            SELECT c.complaint_id, c.bank_reference, c.order_code, c.amount, c.resolution
            FROM payment_complaints c
            WHERE c.status = 'RESOLVED' AND c.resolved_at >= ? AND c.resolved_at < ?
              AND NOT EXISTS (SELECT 1 FROM reconciliation_items i WHERE i.complaint_id = c.complaint_id)
              AND NOT EXISTS (SELECT 1 FROM sepay_webhook_logs l
                              WHERE l.reference_code = c.bank_reference AND l.auth_ok = TRUE
                                AND l.result_status NOT IN ('INVALID_SIGNATURE', 'IGNORED_OUTGOING'))
            """;
        jdbcTemplate.query(complaintSql, rs -> {
            insertItem(ReconciliationItem.builder()
                    .periodId(period.getPeriodId())
                    .itemType(ReconciliationItem.Type.RECORDED_WITHOUT_BANK)
                    .complaintId(rs.getLong("complaint_id"))
                    .referenceCode(rs.getString("bank_reference"))
                    .orderCode(rs.getString("order_code"))
                    .amount(rs.getBigDecimal("amount"))
                    .reason("Đã ghi nhận theo khiếu nại #" + rs.getLong("complaint_id") + " (" + rs.getString("resolution")
                            + ") nhưng SePay chưa báo khoản này, cần đối chiếu sao kê ngân hàng")
                    .build());
        }, from, to);
    }

    /**
     * INSERT IGNORE theo UNIQUE(log_id) / UNIQUE(complaint_id): 2 người mở trang cùng lúc thì dòng trùng bị bỏ qua
     * mà không làm hỏng transaction (lỗi trùng khóa qua JPA sẽ đánh dấu rollback cả lần đọc).
     */
    private void insertItem(ReconciliationItem item) {
        jdbcTemplate.update("""
            INSERT IGNORE INTO reconciliation_items
                (period_id, item_type, log_id, complaint_id, reference_code, order_code, amount, reason, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNRESOLVED', NOW())
            """, item.getPeriodId(), item.getItemType().name(), item.getLogId(), item.getComplaintId(),
                item.getReferenceCode(), truncate(item.getOrderCode(), 255), item.getAmount(), truncate(item.getReason(), 500));
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    private static String bankReason(String status, String orderCode, String source) {
        String suffix = "SIMULATION".equals(source) ? " (giả lập dev)" : "";
        return switch (status) {
            case "ORDER_NOT_FOUND" -> (orderCode == null
                    ? "Nội dung chuyển khoản không có mã đơn"
                    : "Không có đơn " + orderCode) + ", tiền chưa được ghi vào đơn hay ví" + suffix;
            case "AMOUNT_MISSING" -> "SePay không báo số tiền, chưa ghi nhận; nhập số tiền theo sao kê khi xử lý" + suffix;
            case "ALREADY_PROCESSED" -> "Chuyển thêm vào đơn " + orderCode + " đã thanh toán, tiền chưa được ghi" + suffix;
            default -> "Tiền về chưa được ghi nhận (" + status + ")" + suffix;
        };
    }

    // =========================================================================
    // SỐ LIỆU
    // =========================================================================

    /** Tiền SePay báo về trong kỳ; cùng mã GD ngân hàng (giả lập bắn lại) chỉ tính 1 lần. */
    private BigDecimal bankTotal(YearMonth ym) {
        String sql = """
            SELECT COALESCE(SUM(amt), 0) FROM (
                SELECT MAX(l.transfer_amount) AS amt
                FROM sepay_webhook_logs l
                WHERE l.received_at >= ? AND l.received_at < ?
                  AND l.auth_ok = TRUE
                  AND (l.transfer_type IS NULL OR LOWER(l.transfer_type) <> 'out')
                  AND l.result_status NOT IN (%s)
                GROUP BY COALESCE(l.reference_code, CONCAT('LOG-', l.log_id))
            ) x
            """.formatted(placeholders(NOT_BANK_MONEY_STATUSES.size()));
        List<Object> args = new ArrayList<>(List.of(monthStart(ym), monthStart(ym.plusMonths(1))));
        args.addAll(NOT_BANK_MONEY_STATUSES);
        BigDecimal total = jdbcTemplate.queryForObject(sql, BigDecimal.class, args.toArray());
        return total != null ? total : BigDecimal.ZERO;
    }

    /** Tiền hệ thống đã ghi từ ngân hàng trong kỳ: đơn / nạp ví đã thu, bỏ bút toán hoàn và đơn trả bằng ví. */
    private BigDecimal systemTotal(YearMonth ym) {
        String sql = """
            SELECT COALESCE(SUM(amount), 0) FROM transactions
            WHERE status IN ('SUCCESS', 'REFUNDED')
              AND transaction_type <> 'REFUND'
              AND (payment_method IS NULL OR payment_method <> 'WALLET')
              AND paid_at >= ? AND paid_at < ?
            """;
        BigDecimal total = jdbcTemplate.queryForObject(sql, BigDecimal.class, monthStart(ym), monthStart(ym.plusMonths(1)));
        return total != null ? total : BigDecimal.ZERO;
    }

    private ReconciliationPeriodResponse toResponse(ReconciliationPeriod period, YearMonth ym) {
        List<ReconciliationItem> items = itemRepository.findByPeriodIdOrderByCreatedAtAsc(period.getPeriodId());
        List<ReconciliationItem> unresolved = items.stream()
                .filter(i -> i.getStatus() == ReconciliationItem.Status.UNRESOLVED).toList();
        BigDecimal discrepancyTotal = unresolved.stream().map(ReconciliationItem::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal bank = period.isClosed() && period.getBankTotal() != null ? period.getBankTotal() : bankTotal(ym);
        BigDecimal system = period.isClosed() && period.getSystemTotal() != null ? period.getSystemTotal() : systemTotal(ym);
        String status = period.isClosed() ? "CLOSED" : unresolved.isEmpty() ? "RECONCILED" : "OPEN";

        Map<Long, String> names = userNames(items, period);
        return ReconciliationPeriodResponse.builder()
                .id("REC-" + ym.format(DateTimeFormatter.ofPattern("yyyyMM")))
                .month(ym.toString())
                .periodName("Kỳ đối soát Tháng " + ym.format(DateTimeFormatter.ofPattern("MM/yyyy")))
                .startDate(ym.atDay(1).toString())
                .endDate(ym.atEndOfMonth().toString())
                .totalSystemRevenue(system)
                .totalGatewayRevenue(bank)
                .discrepancyTotal(discrepancyTotal)
                .unresolvedCount(unresolved.size())
                .status(status)
                .discrepancies(items.stream().map(i -> toItem(i, names)).toList())
                .closedAt(period.getClosedAt() != null ? period.getClosedAt().format(TIMESTAMP) : null)
                .closedByName(period.getClosedBy() != null ? names.get(period.getClosedBy()) : null)
                .closeNote(period.getCloseNote())
                .recentMonths(periodRepository.findTop12ByOrderByPeriodMonthDesc().stream()
                        .map(ReconciliationPeriod::getPeriodMonth).toList())
                .build();
    }

    private static ReconciliationPeriodResponse.DiscrepancyItem toItem(ReconciliationItem i, Map<Long, String> names) {
        boolean bankSide = i.getItemType() == ReconciliationItem.Type.BANK_NOT_RECORDED;
        return ReconciliationPeriodResponse.DiscrepancyItem.builder()
                .id(String.valueOf(i.getItemId()))
                .itemType(i.getItemType().name())
                .transactionCode(i.getReferenceCode() != null ? i.getReferenceCode() : "LOG-" + i.getLogId())
                .orderCode(i.getOrderCode())
                .systemAmount(bankSide ? BigDecimal.ZERO : i.getAmount())
                .gatewayAmount(bankSide ? i.getAmount() : BigDecimal.ZERO)
                .discrepancyAmount(i.getStatus() == ReconciliationItem.Status.UNRESOLVED ? i.getAmount() : BigDecimal.ZERO)
                .reason(i.getReason())
                .status(i.getStatus().name())
                .action(i.getAction() != null ? i.getAction().name() : null)
                .actionRef(i.getActionRef())
                .actionResult(i.getActionResult())
                .resolutionNote(i.getResolutionNote())
                .resolvedBy(i.getResolvedBy() != null ? names.get(i.getResolvedBy()) : null)
                .resolvedAt(i.getResolvedAt() != null ? i.getResolvedAt().format(TIMESTAMP) : null)
                .logId(i.getLogId())
                .complaintId(i.getComplaintId())
                .build();
    }

    /** Tên người xử lý / người chốt (đọc users như FinanceCurrentUser, không gọi code module identity). */
    private Map<Long, String> userNames(List<ReconciliationItem> items, ReconciliationPeriod period) {
        Set<Long> ids = new HashSet<>();
        items.forEach(i -> { if (i.getResolvedBy() != null) ids.add(i.getResolvedBy()); });
        if (period.getClosedBy() != null) ids.add(period.getClosedBy());
        Map<Long, String> names = new HashMap<>();
        if (ids.isEmpty()) return names;
        jdbcTemplate.query("SELECT user_id, full_name FROM users WHERE user_id IN (" + placeholders(ids.size()) + ")",
                rs -> { names.put(rs.getLong("user_id"), rs.getString("full_name")); }, ids.toArray());
        ids.forEach(id -> names.putIfAbsent(id, "Người dùng #" + id));
        return names;
    }

    // =========================================================================
    // HÀM NỘI BỘ
    // =========================================================================

    /** Mã GD này đã được ghi tiền ở chỗ khác (webhook, khiếu nại, khoản lệch khác) thì không ghi lần 2 (Rule 5). */
    private void assertReferenceNotRecorded(ReconciliationItem item) {
        String ref = item.getReferenceCode();
        if (ref == null) return;
        boolean byGateway = sepayLogRepository
                .findFirstByReferenceCodeAndResultStatusInOrderByReceivedAtAsc(ref, SepayWebhookLog.MONEY_RECORDED_STATUSES)
                .isPresent();
        boolean byComplaint = complaintRepository.findByBankReferenceAndStatus(ref, PaymentComplaint.Status.RESOLVED).isPresent();
        boolean byOtherItem = itemRepository.existsByReferenceCodeAndStatusAndActionIn(ref, ReconciliationItem.Status.RESOLVED, MONEY_ACTIONS);
        if (byGateway || byComplaint || byOtherItem) {
            throw new AppException("Mã GD " + ref + " đã được ghi nhận ở nơi khác, chỉ cần giải trình", HttpStatus.CONFLICT);
        }
    }

    private Long resolveWalletOwner(ResolveDiscrepancyRequest request) {
        Long userId = request.getUserId();
        String orderCode = trimUpper(request.getOrderCode());
        if (userId == null && orderCode != null) {
            userId = transactionRepository.findByGatewayTransactionId(orderCode)
                    .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng " + orderCode, HttpStatus.NOT_FOUND))
                    .getUserId();
        }
        if (userId == null) {
            throw new AppException("Cộng vào ví cần mã khách hàng hoặc mã đơn của khách", HttpStatus.BAD_REQUEST);
        }
        Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE user_id = ?", Integer.class, userId);
        if (exists == null || exists == 0) {
            throw new AppException("Không tìm thấy khách hàng #" + userId, HttpStatus.NOT_FOUND);
        }
        return userId;
    }

    private ReconciliationPeriod findOrCreate(YearMonth ym) {
        String month = ym.toString();
        return periodRepository.findByPeriodMonth(month).orElseGet(() -> {
            jdbcTemplate.update("INSERT IGNORE INTO reconciliation_periods (period_month, status, created_at) VALUES (?, 'OPEN', NOW())", month);
            return periodRepository.findByPeriodMonth(month)
                    .orElseThrow(() -> new AppException("Không tạo được kỳ đối soát " + month, HttpStatus.INTERNAL_SERVER_ERROR));
        });
    }

    private static YearMonth parseMonth(String month) {
        YearMonth ym;
        try {
            ym = month == null || month.isBlank() ? YearMonth.now() : YearMonth.parse(month.trim());
        } catch (DateTimeParseException e) {
            throw new AppException("Tháng không hợp lệ, định dạng yyyy-MM", HttpStatus.BAD_REQUEST);
        }
        if (ym.isAfter(YearMonth.now())) {
            throw new AppException("Chưa thể đối soát tháng " + ym + " (tháng tương lai)", HttpStatus.BAD_REQUEST);
        }
        return ym;
    }

    private static ReconciliationItem.Action parseAction(String action) {
        if (action == null || action.isBlank()) return ReconciliationItem.Action.EXPLAINED;
        try {
            return ReconciliationItem.Action.valueOf(action.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException("Hành động không hợp lệ: " + action + " (ASSIGN_ORDER, CREDIT_WALLET, EXPLAINED)", HttpStatus.BAD_REQUEST);
        }
    }

    private static Long parseItemId(String id) {
        try {
            return Long.valueOf(id.trim());
        } catch (NumberFormatException | NullPointerException e) {
            throw new AppException("Mã khoản lệch không hợp lệ: " + id, HttpStatus.BAD_REQUEST);
        }
    }

    private static String trimUpper(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase();
    }

    private static Timestamp monthStart(YearMonth ym) {
        return Timestamp.valueOf(ym.atDay(1).atStartOfDay());
    }

    private static String placeholders(int n) {
        return String.join(",", Collections.nCopies(n, "?"));
    }
}
