package com.localpress.finance.controller;

import com.localpress.finance.service.AdvertiserReceivablesService;
import com.localpress.finance.service.FinanceReconciliationService;
import com.localpress.shared.exception.AppException;
import com.localpress.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * ==============================================================================
 * CONTROLLER: BÁO CÁO & CẢNH BÁO TÀI CHÍNH (SV4 - UC059, UC060)
 * ==============================================================================
 * Màn hình UI: II.4.12 Financial Reports and Alerts (/backoffice/finance/reports)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
public class FinanceReportController {

    private static final DateTimeFormatter FILE_TIME = DateTimeFormatter.ofPattern("yyyyMMdd_HHmm");

    private final JdbcTemplate jdbcTemplate;
    private final AdvertiserReceivablesService receivablesService;
    private final FinanceReconciliationService reconciliationService;

    /**
     * UC059: Xuất báo cáo giao dịch CSV (UTF-8 có BOM cho Excel).
     * fromDate / toDate (yyyy-MM-dd, bao gồm 2 đầu) lọc theo ngày tạo giao dịch; bỏ trống = toàn bộ.
     * Cuối file có khối tổng hợp tính đúng công thức của Dashboard / Sổ quỹ (Rule 16):
     * tổng thu gộp = SUCCESS + REFUNDED, bỏ TOPUP và REFUND; đã hoàn = REFUND SUCCESS; thuần = gộp - hoàn;
     * nạp ví tách riêng (công nợ phải trả khách, không phải doanh thu).
     */
    @GetMapping(value = "/reports/export", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<byte[]> exportFinancialReport(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate
    ) {
        LocalDate from = parseDate(fromDate, "fromDate");
        LocalDate to = parseDate(toDate, "toDate");
        if (from != null && to != null && from.isAfter(to)) {
            throw new AppException("Từ ngày phải trước hoặc bằng đến ngày", HttpStatus.BAD_REQUEST);
        }
        log.info("API GET /api/v1/finance/reports/export - Xuất CSV từ {} đến {}", from, to);

        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> args = new ArrayList<>();
        if (from != null) {
            where.append(" AND t.created_at >= ?");
            args.add(Timestamp.valueOf(from.atStartOfDay()));
        }
        if (to != null) {
            where.append(" AND t.created_at < ?");
            args.add(Timestamp.valueOf(to.plusDays(1).atStartOfDay()));
        }

        String sql = """
            SELECT
                t.transaction_id,
                t.gateway_transaction_id AS order_code,
                t.created_at,
                t.transaction_type,
                t.amount,
                t.currency,
                t.payment_method,
                t.bank_code,
                t.status,
                t.paid_at,
                t.user_id,
                u.full_name AS customer_name
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.user_id
            """ + where + " ORDER BY t.created_at DESC, t.transaction_id DESC";

        StringBuilder csv = new StringBuilder();
        // BOM để Excel hiển thị đúng tiếng Việt UTF-8
        csv.append("\uFEFF");
        csv.append("Kỳ báo cáo,").append(cell(from == null ? "Từ đầu" : from.toString())).append(',')
                .append(cell(to == null ? "Đến nay" : to.toString())).append('\n');
        csv.append("Mã giao dịch,Mã đơn hàng,Thời gian tạo,Loại dòng thu,Số tiền (VNĐ),Tiền tệ,Phương thức,Ngân hàng,Trạng thái,Thời gian thanh toán,Mã khách hàng,Tên khách hàng\n");

        BigDecimal[] totals = {BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO}; // gộp, đã hoàn, nạp ví
        int[] rows = {0};
        jdbcTemplate.query(sql, rs -> {
            String type = rs.getString("transaction_type");
            String status = rs.getString("status");
            BigDecimal amount = rs.getBigDecimal("amount");
            if (("SUCCESS".equals(status) || "REFUNDED".equals(status)) && !"REFUND".equals(type) && !"TOPUP".equals(type)) {
                totals[0] = totals[0].add(amount);
            } else if ("REFUND".equals(type) && "SUCCESS".equals(status)) {
                totals[1] = totals[1].add(amount);
            } else if ("TOPUP".equals(type) && "SUCCESS".equals(status)) {
                totals[2] = totals[2].add(amount);
            }
            rows[0]++;
            csv.append(String.join(",",
                    cell(String.valueOf(rs.getLong("transaction_id"))),
                    cell(rs.getString("order_code")),
                    cell(rs.getString("created_at")),
                    cell(type),
                    cell(amount.toPlainString()),
                    cell(rs.getString("currency")),
                    cell(rs.getString("payment_method")),
                    cell(rs.getString("bank_code")),
                    cell(status),
                    cell(rs.getString("paid_at")),
                    cell(String.valueOf(rs.getLong("user_id"))),
                    cell(rs.getString("customer_name"))
            )).append('\n');
        }, args.toArray());

        csv.append('\n');
        csv.append("Tổng hợp (cùng công thức Dashboard / Sổ quỹ)\n");
        csv.append("Số giao dịch,").append(rows[0]).append('\n');
        csv.append("Tổng thu gộp,").append(totals[0].toPlainString()).append('\n');
        csv.append("Đã hoàn,").append(totals[1].toPlainString()).append('\n');
        csv.append("Doanh thu thuần,").append(totals[0].subtract(totals[1]).toPlainString()).append('\n');
        csv.append("Nạp ví (công nợ phải trả khách),").append(totals[2].toPlainString()).append('\n');

        byte[] output = csv.toString().getBytes(StandardCharsets.UTF_8);
        String range = (from != null ? from.toString() : "dau") + "_" + (to != null ? to.toString() : "nay");
        String filename = "Bao_cao_tai_chinh_" + range + "_" + LocalDateTime.now().format(FILE_TIME) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(output);
    }

    /**
     * UC060: Cảnh báo tài chính cuối kỳ. Mỗi cảnh báo dẫn tới đúng màn hình xử lý (actionUrl).
     * Số liệu lấy từ cùng service với màn hình tương ứng nên luôn khớp.
     */
    @GetMapping("/alerts")
    @Transactional
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFinancialAlerts() {
        log.info("API GET /api/v1/finance/alerts - Lấy danh sách cảnh báo tài chính");

        List<Map<String, Object>> alerts = new ArrayList<>();

        // 1. Yêu cầu hoàn tiền đang chờ mắt 2
        addAlertIfAny(alerts, count("SELECT COUNT(*) FROM refund_requests WHERE status = 'PENDING'"),
                "REFUND_PENDING", "HIGH", "Yêu cầu hoàn tiền chờ duyệt",
                "Có %d yêu cầu hoàn tiền đang chờ Kế toán trưởng phê duyệt theo nguyên tắc 4 mắt.",
                "/backoffice/finance/refunds");

        // 2. Khiếu nại "đã chuyển tiền nhưng chưa được ghi nhận" (UC051)
        addAlertIfAny(alerts, count("SELECT COUNT(*) FROM payment_complaints WHERE status = 'OPEN'"),
                "COMPLAINT_OPEN", "MEDIUM", "Khiếu nại thanh toán chờ đối soát",
                "Có %d khiếu nại khách đã chuyển tiền nhưng chưa được ghi nhận, cần đối chiếu sao kê.",
                "/backoffice/finance/complaints");

        // 3. Công nợ quảng cáo quá hạn (cùng logic màn hình công nợ UC053)
        addAlertIfAny(alerts, receivablesService.countOverdue(),
                "DEBT_OVERDUE", "HIGH", "Công nợ quảng cáo B2B quá hạn",
                "Có %d chiến dịch quảng cáo đã quá hạn nhưng chưa thanh toán đủ.",
                "/backoffice/finance/receivables");

        // 4. Khoản lệch đối soát tháng hiện tại chưa xử lý (UC054)
        addAlertIfAny(alerts, reconciliationService.currentUnresolvedCount(),
                "RECONCILIATION_UNRESOLVED", "MEDIUM", "Khoản lệch đối soát chưa xử lý",
                "Có %d khoản tiền giữa sao kê SePay và hệ thống chưa khớp trong kỳ này.",
                "/backoffice/finance/reconciliation");

        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách cảnh báo tài chính thành công", alerts));
    }

    private long count(String sql) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class);
        return value != null ? value : 0;
    }

    private static void addAlertIfAny(List<Map<String, Object>> alerts, long count, String type, String severity,
                                      String title, String messageFormat, String actionUrl) {
        if (count <= 0) return;
        Map<String, Object> alert = new LinkedHashMap<>();
        alert.put("type", type);
        alert.put("severity", severity);
        alert.put("title", title);
        alert.put("message", String.format(messageFormat, count));
        alert.put("count", count);
        alert.put("actionUrl", actionUrl);
        alerts.add(alert);
    }

    private static LocalDate parseDate(String value, String name) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new AppException(name + " không hợp lệ, định dạng yyyy-MM-dd", HttpStatus.BAD_REQUEST);
        }
    }

    /** Ô CSV: bọc nháy kép, nhân đôi nháy kép bên trong; chặn công thức Excel (=, +, -, @) ở ô chữ. */
    private static String cell(String value) {
        String v = Objects.toString(value, "");
        if (!v.isEmpty() && "=+@".indexOf(v.charAt(0)) >= 0) {
            v = "'" + v;
        }
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }
}
