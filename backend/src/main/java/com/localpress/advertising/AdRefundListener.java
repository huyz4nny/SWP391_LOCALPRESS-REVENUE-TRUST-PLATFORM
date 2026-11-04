package com.localpress.advertising;

import com.localpress.shared.event.RefundCompletedEvent;
import com.localpress.shared.event.RefundRejectedEvent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Locale;
import java.util.Objects;

/**
 * UC013: SV4 báo kết quả phiếu hoàn của yêu cầu hủy. Ghép qua ad_cancellation_requests.refund_request_id
 * (= refundId) và campaign_id (= targetId), không đọc refund_requests của SV4 (Rule 17).
 * Chạy sau khi transaction của SV4 commit; REQUIRES_NEW vì lúc đó transaction cũ đã đóng, ghi không vào nữa.
 * Thu hồi chiến dịch khi hoàn toàn bộ vẫn nằm ở AdBookingService.onRefundCompleted (chạy trong transaction SV4).
 */
@Component
public class AdRefundListener {
    private final JdbcTemplate jdbc;
    private final AdNotificationService notifications;

    public AdRefundListener(JdbcTemplate jdbc, AdNotificationService notifications) {
        this.jdbc = jdbc;
        this.notifications = notifications;
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onRejected(RefundRejectedEvent e) {
        if (!"AD".equals(e.getTransactionType()) || e.getTargetId() == null) return;
        int changed = jdbc.update("UPDATE ad_cancellation_requests SET refund_decision = 'REJECTED', "
                        + "review_notes = ?, decided_at = ? "
                        + "WHERE campaign_id = ? AND refund_request_id = ? AND refund_decision = 'PENDING'",
                e.getReviewNotes(), e.getRejectedAt(), e.getTargetId(), e.getRefundId());
        if (changed == 0) return;
        notifications.notify(e.getUserId(), e.getTargetId(), "AD_REFUND_REJECTED", "Khoản hoàn bị từ chối",
                Objects.toString(e.getReviewNotes(), "Liên hệ kế toán để biết lý do"), String.valueOf(e.getRefundId()));
    }

    /** Chiến dịch giữ nguyên CANCELLED; chỉ cập nhật yêu cầu hủy và báo doanh nghiệp. */
    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onCompleted(RefundCompletedEvent e) {
        if (!"AD".equals(e.getTransactionType()) || e.getTargetId() == null) return;
        int changed = jdbc.update("UPDATE ad_cancellation_requests SET refund_decision = 'APPROVED', "
                        + "refund_status = 'REFUNDED', refunded_amount = ?, decided_at = ?, refunded_at = ? "
                        + "WHERE campaign_id = ? AND refund_request_id = ?",
                e.getRefundAmount(), e.getRefundedAt(), e.getRefundedAt(), e.getTargetId(), e.getRefundId());
        if (changed == 0) return;
        String refundId = String.valueOf(e.getRefundId());
        notifications.notify(e.getUserId(), e.getTargetId(), "AD_REFUND_APPROVED", "Khoản hoàn đã được duyệt",
                "Kế toán đã duyệt khoản hoàn của chiến dịch.", refundId);
        notifications.notify(e.getUserId(), e.getTargetId(), "AD_REFUNDED", "Đã hoàn tiền chiến dịch",
                String.format(Locale.forLanguageTag("vi-VN"), "Số tiền đã hoàn: %,.0f đ", e.getRefundAmount()), refundId);
    }
}
