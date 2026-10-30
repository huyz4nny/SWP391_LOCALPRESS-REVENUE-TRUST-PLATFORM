package com.localpress.finance.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * ENTITY: LỊCH SỬ NHẮC NỢ QUẢNG CÁO (SV4 - UC053)
 * ==============================================================================
 * campaign_id / advertiser_id là khóa vô hướng tới bảng của SV1 (Rule 17). SV4 chỉ lưu lần nhắc
 * và phát ReceivableReminderEvent; SV1 tự gửi thông báo cho doanh nghiệp.
 */
@Entity
@Table(name = "receivable_reminders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceivableReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reminder_id")
    private Long reminderId;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column(name = "advertiser_id", nullable = false)
    private Long advertiserId;

    @Column(name = "amount_due", nullable = false, precision = 14, scale = 2)
    private BigDecimal amountDue;

    @Column(name = "overdue_days", nullable = false)
    private Integer overdueDays;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "sent_by", nullable = false)
    private Long sentBy;

    @Column(name = "sent_at", nullable = false)
    @Builder.Default
    private LocalDateTime sentAt = LocalDateTime.now();
}
