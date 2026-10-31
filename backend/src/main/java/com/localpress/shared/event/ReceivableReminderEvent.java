package com.localpress.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * HỢP ĐỒNG SỰ KIỆN MIỀN (SHARED DOMAIN EVENT): KẾ TOÁN NHẮC NỢ QUẢNG CÁO (UC053)
 * ==============================================================================
 * - Kế toán bấm "Gửi nhắc nợ" cho 1 chiến dịch còn nợ, Finance (SV4) lưu receivable_reminders
 *   rồi publish sự kiện này.
 * - Tuân thủ Quy tắc 17: SV4 không ghi bảng notifications / ad_campaigns của module khác.
 *   SV1 (Advertising) tự viết @EventListener để báo cho doanh nghiệp (thông báo trong cổng B2B, email...).
 * - Không có listener thì lần nhắc vẫn được lưu, chỉ là doanh nghiệp chưa thấy thông báo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceivableReminderEvent {

    /** receivable_reminders.reminder_id */
    private Long reminderId;

    /** ad_campaigns.campaign_id */
    private Long campaignId;

    /** advertisers.advertiser_id */
    private Long advertiserId;

    private String campaignName;

    /** Số tiền còn phải trả (VND). */
    private BigDecimal amountDue;

    private LocalDate dueDate;

    /** 0 khi chưa quá hạn. */
    private long overdueDays;

    /** Lời nhắn của kế toán. */
    private String note;

    /** user_id kế toán gửi nhắc. */
    private Long sentBy;

    private LocalDateTime sentAt;
}
