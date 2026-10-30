package com.localpress.finance.service;

import com.localpress.finance.dto.response.AdvertiserReceivableResponse;
import com.localpress.finance.model.ReceivableReminder;
import com.localpress.finance.repository.ReceivableReminderRepository;
import com.localpress.shared.event.ReceivableReminderEvent;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * ==============================================================================
 * DỊCH VỤ QUẢN LÝ CÔNG NỢ QUẢNG CÁO B2B (SV4 - ADVERTISER RECEIVABLES SERVICE)
 * ==============================================================================
 * Tuân thủ Rule 17 (Strict Boundary):
 * - Chỉ ĐỌC `ad_campaigns` và `advertisers` (SV1) qua JdbcTemplate để biết giá trị hợp đồng và hạn,
 *   không dùng Entity / Repository nội bộ của SV1, không ghi vào bảng của SV1.
 * - Nhắc nợ: SV4 lưu receivable_reminders và phát ReceivableReminderEvent; SV1 tự báo cho doanh nghiệp.
 *
 * Công nợ chỉ tính cho chiến dịch đã có báo giá (quoted_amount > 0), chưa bị từ chối / hủy, chưa hoàn tiền.
 * Đã trả = tổng đơn AD đã thu tiền (SUCCESS, hoặc REFUNDED vì tiền đã thu rồi mới hoàn theo quyết định riêng).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdvertiserReceivablesService {

    /** Mỗi chiến dịch chỉ được nhắc 1 lần trong 24 giờ, tránh spam doanh nghiệp. */
    static final long REMINDER_COOLDOWN_HOURS = 24;

    private static final String RECEIVABLES_SQL = """
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
                  AND t.transaction_type = 'AD'
                  AND t.status IN ('SUCCESS', 'REFUNDED')
            ), 0) AS paid_amount,
            (SELECT COUNT(*) FROM receivable_reminders r WHERE r.campaign_id = c.campaign_id) AS reminder_count,
            (SELECT MAX(r.sent_at) FROM receivable_reminders r WHERE r.campaign_id = c.campaign_id) AS last_reminder_at
        FROM ad_campaigns c
        JOIN advertisers a ON c.advertiser_id = a.advertiser_id
        WHERE c.quoted_amount > 0
          AND c.status NOT IN ('DRAFT', 'REJECTED')
          AND c.payment_status <> 'REFUNDED'
        """;

    private final JdbcTemplate jdbcTemplate;
    private final ReceivableReminderRepository reminderRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * UC053: Lấy danh sách công nợ tất cả các hợp đồng chiến dịch quảng cáo B2B.
     */
    @Transactional(readOnly = true)
    public List<AdvertiserReceivableResponse> getReceivablesList() {
        log.info("Lấy danh sách công nợ quảng cáo B2B toàn hệ thống");
        LocalDate today = LocalDate.now();
        return jdbcTemplate.query(RECEIVABLES_SQL + " ORDER BY c.end_date ASC, c.campaign_id ASC",
                (rs, rowNum) -> toResponse(rs, today));
    }

    /** Số chiến dịch quá hạn còn nợ: cảnh báo DEBT_OVERDUE dùng đúng logic của màn hình công nợ. */
    @Transactional(readOnly = true)
    public long countOverdue() {
        return getReceivablesList().stream().filter(r -> "OVERDUE".equals(r.getDebtGroup())).count();
    }

    /**
     * UC053: Gửi nhắc nợ cho 1 chiến dịch còn nợ. Lưu lịch sử rồi phát sự kiện cho SV1.
     * Đã tất toán -> 400; vừa nhắc trong 24 giờ -> 409.
     */
    @Transactional
    public AdvertiserReceivableResponse sendReminder(Long campaignId, Long accountantId, String note) {
        LocalDate today = LocalDate.now();
        AdvertiserReceivableResponse receivable = jdbcTemplate.query(
                        RECEIVABLES_SQL + " AND c.campaign_id = ?", (rs, rowNum) -> toResponse(rs, today), campaignId)
                .stream().findFirst()
                .orElseThrow(() -> new AppException("Không tìm thấy công nợ của chiến dịch #" + campaignId, HttpStatus.NOT_FOUND));

        if (receivable.getRemainingDebt().signum() <= 0) {
            throw new AppException("Chiến dịch #" + campaignId + " đã thanh toán đủ, không cần nhắc nợ", HttpStatus.BAD_REQUEST);
        }
        LocalDateTime now = LocalDateTime.now();
        reminderRepository.findFirstByCampaignIdOrderBySentAtDesc(campaignId)
                .filter(last -> last.getSentAt().isAfter(now.minusHours(REMINDER_COOLDOWN_HOURS)))
                .ifPresent(last -> {
                    throw new AppException("Chiến dịch #" + campaignId + " đã được nhắc nợ lúc " + last.getSentAt()
                            + ", mỗi 24 giờ chỉ nhắc 1 lần", HttpStatus.CONFLICT);
                });

        String trimmedNote = note == null || note.isBlank() ? null : note.trim();
        ReceivableReminder saved = reminderRepository.save(ReceivableReminder.builder()
                .campaignId(campaignId)
                .advertiserId(receivable.getAdvertiserId())
                .amountDue(receivable.getRemainingDebt())
                .overdueDays((int) receivable.getOverdueDays())
                .note(trimmedNote)
                .sentBy(accountantId)
                .sentAt(now)
                .build());

        eventPublisher.publishEvent(ReceivableReminderEvent.builder()
                .reminderId(saved.getReminderId())
                .campaignId(campaignId)
                .advertiserId(receivable.getAdvertiserId())
                .campaignName(receivable.getCampaignName())
                .amountDue(receivable.getRemainingDebt())
                .dueDate(receivable.getDueDate())
                .overdueDays(receivable.getOverdueDays())
                .note(trimmedNote)
                .sentBy(accountantId)
                .sentAt(now)
                .build());
        log.info("Kế toán #{} nhắc nợ chiến dịch #{}: còn {} VND, quá hạn {} ngày",
                accountantId, campaignId, receivable.getRemainingDebt(), receivable.getOverdueDays());

        receivable.setReminderCount(receivable.getReminderCount() + 1);
        receivable.setLastReminderAt(now);
        return receivable;
    }

    private static AdvertiserReceivableResponse toResponse(java.sql.ResultSet rs, LocalDate today) throws java.sql.SQLException {
        BigDecimal contractValue = rs.getBigDecimal("quoted_amount");
        BigDecimal paidAmount = rs.getBigDecimal("paid_amount");
        BigDecimal remainingDebt = contractValue.subtract(paidAmount).max(BigDecimal.ZERO);
        LocalDate dueDate = localDateOr(rs.getDate("end_date"), today);

        long overdueDays = 0;
        String debtGroup;
        if (remainingDebt.signum() == 0) {
            debtGroup = "PAID_IN_FULL";
        } else if (today.isAfter(dueDate)) {
            overdueDays = ChronoUnit.DAYS.between(dueDate, today);
            debtGroup = "OVERDUE";
        } else {
            debtGroup = "IN_TERM";
        }

        java.sql.Timestamp lastReminder = rs.getTimestamp("last_reminder_at");
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
                .startDate(localDateOr(rs.getDate("start_date"), today))
                .dueDate(dueDate)
                .overdueDays(overdueDays)
                .paymentStatus(rs.getString("payment_status"))
                .campaignStatus(rs.getString("campaign_status"))
                .debtGroup(debtGroup)
                .reminderCount(rs.getLong("reminder_count"))
                .lastReminderAt(lastReminder != null ? lastReminder.toLocalDateTime() : null)
                .build();
    }

    private static LocalDate localDateOr(Date date, LocalDate fallback) {
        return date != null ? date.toLocalDate() : fallback;
    }
}
