package com.localpress.finance.controller;

import com.localpress.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * ==============================================================================
 * CONTROLLER: BÁO CÁO TÀI CHÍNH QUẢN TRỊ & CẢNH BÁO RỦI RO (SV4 - UC059, UC060)
 * ==============================================================================
 * Phân hệ: com.localpress.finance (SV4 - Huy)
 * Màn hình UI: II.4.8 Financial Reports and Alerts
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
public class FinanceReportController {

    private final JdbcTemplate jdbcTemplate;

    /**
     * UC059: Xuất báo cáo tài chính quản trị dạng file CSV (Sổ cái thu/chi, hoàn tiền, đối soát).
     */
    @GetMapping(value = "/reports/export", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<byte[]> exportFinancialReport(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate
    ) {
        log.info("API GET /api/v1/finance/reports/export - Xuất file báo cáo tài chính CSV");

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
            JOIN users u ON t.user_id = u.user_id
            ORDER BY t.created_at DESC
        """;

        StringBuilder csv = new StringBuilder();
        // BOM để Excel hiển thị đúng tiếng Việt UTF-8
        csv.append("\uFEFF");
        csv.append("Mã giao dịch,Mã đơn hàng,Thời gian tạo,Loại dòng thu,Số tiền (VNĐ),Tiền tệ,Phương thức,Ngân hàng,Trạng thái,Thời gian thanh toán,Mã khách hàng,Tên khách hàng\n");

        jdbcTemplate.query(sql, (rs) -> {
            csv.append(String.format("\"%d\",\"%s\",\"%s\",\"%s\",\"%.2f\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%d\",\"%s\"\n",
                    rs.getLong("transaction_id"),
                    Objects.toString(rs.getString("order_code"), ""),
                    rs.getString("created_at"),
                    rs.getString("transaction_type"),
                    rs.getBigDecimal("amount"),
                    rs.getString("currency"),
                    rs.getString("payment_method"),
                    Objects.toString(rs.getString("bank_code"), ""),
                    rs.getString("status"),
                    Objects.toString(rs.getString("paid_at"), ""),
                    rs.getLong("user_id"),
                    Objects.toString(rs.getString("customer_name"), "")
            ));
        });

        byte[] output = csv.toString().getBytes(StandardCharsets.UTF_8);
        String filename = "Bao_cao_tai_chinh_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm")) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(output);
    }

    /**
     * UC060: Trung tâm cảnh báo rủi ro tài chính (giao dịch pending quá hạn, hoàn tiền chưa duyệt, công nợ quá hạn).
     */
    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFinancialAlerts() {
        log.info("API GET /api/v1/finance/alerts - Lấy danh sách cảnh báo tài chính");

        List<Map<String, Object>> alerts = new ArrayList<>();

        // 1. Yêu cầu hoàn tiền đang chờ duyệt
        addAlertIfAny(alerts, "SELECT COUNT(*) FROM refund_requests WHERE status = 'PENDING'",
                "REFUND_PENDING", "HIGH", "Yêu cầu hoàn tiền chờ duyệt",
                "Có %d yêu cầu hoàn tiền đang chờ Kế toán trưởng phê duyệt theo nguyên tắc 4 mắt.",
                "/backoffice/finance/refunds");

        // 2. Khiếu nại "đã chuyển tiền nhưng chưa được ghi nhận" đang chờ đối soát sao kê (UC051)
        addAlertIfAny(alerts, "SELECT COUNT(*) FROM payment_complaints WHERE status = 'OPEN'",
                "COMPLAINT_OPEN", "MEDIUM", "Khiếu nại thanh toán chờ đối soát",
                "Có %d khiếu nại khách đã chuyển tiền nhưng chưa được ghi nhận, cần đối chiếu sao kê.",
                "/backoffice/finance/complaints");

        // 3. Công nợ quảng cáo B2B quá hạn
        addAlertIfAny(alerts, "SELECT COUNT(*) FROM ad_campaigns WHERE payment_status = 'UNPAID' AND end_date < CURRENT_DATE",
                "DEBT_OVERDUE", "HIGH", "Công nợ quảng cáo B2B quá hạn",
                "Có %d hợp đồng quảng cáo đã quá hạn thanh toán nhưng chưa thanh toán đủ.",
                "/backoffice/finance/orders?type=AD_CAMPAIGN");

        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách cảnh báo tài chính thành công", alerts));
    }

    /** Thêm 1 cảnh báo khi câu đếm countSql > 0; messageFormat nhận số đếm qua %d. */
    private void addAlertIfAny(List<Map<String, Object>> alerts, String countSql, String type, String severity,
                               String title, String messageFormat, String actionUrl) {
        Integer count = jdbcTemplate.queryForObject(countSql, Integer.class);
        if (count != null && count > 0) {
            alerts.add(Map.of(
                    "type", type,
                    "severity", severity,
                    "title", title,
                    "message", String.format(messageFormat, count),
                    "actionUrl", actionUrl
            ));
        }
    }
}
