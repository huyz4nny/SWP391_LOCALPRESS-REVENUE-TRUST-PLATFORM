package com.localpress.finance.service;

import com.localpress.finance.dto.response.AdvertiserReceivableResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * ==============================================================================
 * DỊCH VỤ QUẢN LÝ CÔNG NỢ QUẢNG CÁO B2B (SV4 - ADVERTISER RECEIVABLES SERVICE)
 * ==============================================================================
 * Tuân thủ Rule 17 (Strict Boundary):
 * - Sử dụng JdbcTemplate để truy vấn dữ liệu từ `ad_campaigns` và `advertisers` (SV1),
 *   không can thiệp vào Entity hoặc Repository nội bộ của SV1.
 * - Tính toán chính xác: Giá trị hợp đồng, Số tiền đã trả (từ transactions SUCCESS),
 *   Công nợ còn lại, Số ngày quá hạn và phân loại nhóm tuổi nợ.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdvertiserReceivablesService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * UC053: Lấy danh sách công nợ tất cả các hợp đồng chiến dịch quảng cáo B2B.
     */
    @Transactional(readOnly = true)
    public List<AdvertiserReceivableResponse> getReceivablesList() {
        log.info("Lấy danh sách công nợ quảng cáo B2B toàn hệ thống");

        String sql = """
            SELECT 
                c.campaign_id,
                c.campaign_name,
                c.advertiser_id,
                a.company_name,
                a.tax_code,
                a.contact_person,
                a.email,
                a.phone,
                c.contract_reference,
                c.quoted_amount,
                c.start_date,
                c.end_date,
                c.payment_status,
                c.status AS campaign_status,
                COALESCE((
                    SELECT SUM(t.amount) 
                    FROM transactions t 
                    WHERE t.campaign_id = c.campaign_id 
                      AND t.status = 'SUCCESS'
                ), 0) AS paid_amount
            FROM ad_campaigns c
            JOIN advertisers a ON c.advertiser_id = a.advertiser_id
            ORDER BY c.created_at DESC
        """;

        LocalDate today = LocalDate.now();

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            BigDecimal contractValue = rs.getBigDecimal("quoted_amount");
            BigDecimal paidAmount = rs.getBigDecimal("paid_amount");
            BigDecimal remainingDebt = contractValue.subtract(paidAmount);
            if (remainingDebt.compareTo(BigDecimal.ZERO) < 0) {
                remainingDebt = BigDecimal.ZERO;
            }

            Date endDateSql = rs.getDate("end_date");
            LocalDate dueDate = endDateSql != null ? endDateSql.toLocalDate() : today;

            long overdueDays = 0;
            String debtGroup;

            if (remainingDebt.compareTo(BigDecimal.ZERO) == 0 && contractValue.compareTo(BigDecimal.ZERO) > 0) {
                debtGroup = "PAID_IN_FULL";
            } else if (today.isAfter(dueDate)) {
                overdueDays = ChronoUnit.DAYS.between(dueDate, today);
                debtGroup = "OVERDUE";
            } else {
                debtGroup = "IN_TERM";
            }

            Date startDateSql = rs.getDate("start_date");
            LocalDate startDate = startDateSql != null ? startDateSql.toLocalDate() : today;

            return AdvertiserReceivableResponse.builder()
                    .campaignId(rs.getLong("campaign_id"))
                    .campaignName(rs.getString("campaign_name"))
                    .advertiserId(rs.getLong("advertiser_id"))
                    .companyName(rs.getString("company_name"))
                    .taxCode(rs.getString("tax_code"))
                    .contactPerson(rs.getString("contact_person"))
                    .email(rs.getString("email"))
                    .phone(rs.getString("phone"))
                    .contractReference(rs.getString("contract_reference"))
                    .contractValue(contractValue)
                    .paidAmount(paidAmount)
                    .remainingDebt(remainingDebt)
                    .startDate(startDate)
                    .dueDate(dueDate)
                    .overdueDays(overdueDays)
                    .paymentStatus(rs.getString("payment_status"))
                    .campaignStatus(rs.getString("campaign_status"))
                    .debtGroup(debtGroup)
                    .build();
        });
    }
}
