package com.localpress.advertising;

import com.localpress.finance.dto.request.ProposeRefundRequest;
import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.finance.service.RefundManagementService;
import com.localpress.shared.event.RefundCompletedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static com.localpress.advertising.CampaignStage.date;
import static com.localpress.advertising.CampaignStage.number;
import static com.localpress.advertising.CampaignStage.text;

/**
 * UC013: doanh nghiệp hủy chiến dịch và xin hoàn tiền.
 * Hủy có hiệu lực ngay (dừng phát, nhả chỗ); khoản hoàn là đề xuất gửi SV4, kế toán trưởng mới quyết định.
 * SV1 chỉ gọi service công khai của SV4, không đọc bảng refund_requests/transactions (Rule 17).
 */
@Service
public class AdCancellationService {
    static final String POLICY = "Hủy có hiệu lực ngay và không thể hoàn tác. "
            + "Chưa thanh toán: không phát sinh hoàn tiền. "
            + "Đã thanh toán, chưa tới lịch: đề xuất hoàn toàn bộ số thực thu. "
            + "Trong lịch: làm tròn xuống số thực thu × ngày từ ngày mai đến hết lịch ÷ tổng ngày. "
            + "Dưới 1.000 đ: không phát sinh hoàn tiền. "
            + "Khoản hoàn cần kế toán duyệt; gửi yêu cầu chưa có nghĩa là đã hoàn tiền.";
    private static final BigDecimal MIN_REFUND = BigDecimal.valueOf(1000);

    private final JdbcTemplate jdbc;
    private final AdBookingService bookings;
    private final PaymentProcessingService payments;
    private final RefundManagementService refunds;
    private final AdNotificationService notifications;
    private final CampaignStage stages;

    public AdCancellationService(JdbcTemplate jdbc, AdBookingService bookings, PaymentProcessingService payments,
                                 RefundManagementService refunds, AdNotificationService notifications,
                                 CampaignStage stages) {
        this.jdbc = jdbc;
        this.bookings = bookings;
        this.payments = payments;
        this.refunds = refunds;
        this.notifications = notifications;
        this.stages = stages;
    }

    public record CancellationQuote(boolean allowed, String blockedReason, BigDecimal paidAmount, long totalDays,
                                    long unusedDays, BigDecimal proposedAmount, boolean refundApplicable,
                                    String policyText) {}

    public record CancellationRequest(String id, String campaignId, String campaignName, String reason,
                                      LocalDateTime effectiveAt, BigDecimal paidAmount, long totalDays,
                                      long unusedDays, BigDecimal proposedAmount, String refundDecision,
                                      String refundStatus, BigDecimal refundedAmount, String reviewNotes,
                                      LocalDateTime decidedAt, LocalDateTime refundedAt) {}

    /** Số tiền thực thu lấy từ đơn SePay của SV4 (chỉ trả đơn thuộc chính doanh nghiệp). */
    private OrderStatusResponse order(AdBookingService.Advertiser me, Map<String, Object> campaign) {
        String code = text(campaign, "payment_order_code");
        if (code.isEmpty()) return null;
        return payments.getOrderStatusByCode(new FinanceCurrentUser.Principal(me.userId(), "ADVERTISER"), code);
    }

    public CancellationQuote quote(String email, long id) {
        var me = bookings.advertiser(email);
        bookings.owned(me, id, false);
        var campaign = stages.rows(me.advertiserId(), id).get(0);
        return calculate(campaign, stages.today(), order(me, campaign));
    }

    /** Hôm nay tính là đã chạy (đã phát một phần), nên ngày chưa chạy đếm từ ngày mai đến end_date. */
    static CancellationQuote calculate(Map<String, Object> c, LocalDate today, OrderStatusResponse order) {
        LocalDate start = date(c, "start_date");
        LocalDate end = date(c, "end_date");
        long total = ChronoUnit.DAYS.between(start, end) + 1;
        long unused = today.isBefore(start) ? total : Math.max(0, ChronoUnit.DAYS.between(today, end));

        String blocked = blockedReason(c, today);
        BigDecimal paid = order != null && order.isPaid() ? order.getAmount() : BigDecimal.ZERO;
        if (text(c, "payment_status").equals("PAID") && paid.signum() == 0 && blocked.isEmpty()) {
            blocked = "Chưa đối chiếu được đơn đã thu tiền";
        }
        BigDecimal proposed = paid.multiply(BigDecimal.valueOf(unused))
                .divide(BigDecimal.valueOf(total), 0, RoundingMode.DOWN);
        boolean refundApplicable = proposed.compareTo(MIN_REFUND) >= 0;
        return new CancellationQuote(blocked.isEmpty(), blocked, paid, total, unused, proposed, refundApplicable, POLICY);
    }

    private static String blockedReason(Map<String, Object> c, LocalDate today) {
        if (Set.of("CANCELLED", "REJECTED", "COMPLETED").contains(text(c, "status"))) {
            return "Chiến dịch đã đóng hoặc đã hủy";
        }
        if (date(c, "end_date").isBefore(today)) return "Chiến dịch đã hết lịch";
        if (text(c, "payment_status").equals("REFUNDED")) return "Chiến dịch đã hoàn toàn bộ tiền";
        // payment_issue đã có luồng đề xuất hoàn riêng từ Iter 2.
        if (!text(c, "payment_issue").isBlank()) return "Thanh toán đang có vấn đề, vui lòng liên hệ kế toán";
        return "";
    }

    /**
     * Một transaction: khóa slot rồi campaign (cùng thứ tự với createPayment/confirmPayment để tiền về
     * đồng thời không làm lệch số hoàn), hủy, đề xuất hoàn. SV4 từ chối đề xuất (vd vượt trần Rule 11)
     * thì ném lỗi -> rollback, chiến dịch không bị hủy.
     */
    @Transactional
    public CancellationRequest cancel(String email, long id, String reason) {
        if (reason == null || reason.isBlank() || reason.length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lý do hủy bắt buộc, tối đa 1.000 ký tự");
        }
        String why = reason.trim();
        var me = bookings.advertiser(email);
        var peek = bookings.owned(me, id, false);
        jdbc.queryForList("SELECT slot_id FROM ad_slots WHERE slot_id = ? FOR UPDATE", peek.slotId());
        bookings.owned(me, id, true);
        // Locking read: không dùng snapshot đọc trước khi chờ khóa của một yêu cầu hủy khác.
        var campaign = jdbc.queryForMap("SELECT * FROM ad_campaigns WHERE campaign_id = ? FOR UPDATE", id);
        var order = order(me, campaign);
        var q = calculate(campaign, stages.today(), order);
        if (!q.allowed()) throw new ResponseStatusException(HttpStatus.CONFLICT, q.blockedReason());

        Long refundId = null;
        if (q.refundApplicable()) {
            var refund = refunds.proposeRefund(me.userId(), ProposeRefundRequest.builder()
                    .orderId(order.getTransactionId())
                    .refundAmount(q.proposedAmount())
                    .reason("Hủy chiến dịch #" + id + ": " + why)
                    .affectedBenefit("Chiến dịch dừng ngay khi hủy")
                    .build());
            refundId = Long.valueOf(refund.getId());
        }

        // Đơn đã thu tiền nhưng SV1 chưa ghi nhận (event chưa tới) thì ghi PAID luôn để event đến sau bỏ qua.
        jdbc.update("UPDATE ad_campaigns SET status = 'CANCELLED', hold_expires_at = NOW(), "
                        + "payment_status = IF(? > 0, 'PAID', payment_status), "
                        + "paid_amount = IF(? > 0, ?, paid_amount) WHERE campaign_id = ?",
                q.paidAmount(), q.paidAmount(), q.paidAmount(), id);
        jdbc.update("INSERT INTO ad_cancellation_requests (campaign_id, advertiser_id, requested_by, reason, "
                        + "paid_amount, total_days, unused_days, proposed_amount, refund_request_id, refund_decision) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, me.advertiserId(), me.userId(), why, q.paidAmount(), q.totalDays(), q.unusedDays(),
                q.proposedAmount(), refundId, q.refundApplicable() ? "PENDING" : "NOT_APPLICABLE");
        bookings.audit(me.userId(), "AD_CAMPAIGN_CANCELLED", id,
                Map.of("reason", why, "proposedAmount", q.proposedAmount()));
        String content = text(campaign, "campaign_name") + ". "
                + (q.refundApplicable() ? "Khoản hoàn đang chờ kế toán duyệt." : "Không phát sinh hoàn tiền.");
        notifications.notify(me.userId(), id, "AD_CANCELLED", "Chiến dịch đã hủy", content, "1");

        return requests(me.advertiserId()).stream()
                .filter(r -> r.campaignId().equals(String.valueOf(id)))
                .findFirst().orElseThrow();
    }

    /** SV4 không phát event khi từ chối hoàn tiền, nên đồng bộ các yêu cầu còn PENDING mỗi lần đọc. */
    @Transactional
    public List<CancellationRequest> myRequests(String email) {
        var me = bookings.advertiser(email);
        if (me.advertiserId() == null) return List.of();
        var pending = jdbc.queryForList("SELECT * FROM ad_cancellation_requests "
                + "WHERE advertiser_id = ? AND refund_decision = 'PENDING' AND refund_request_id IS NOT NULL",
                me.advertiserId());
        if (!pending.isEmpty()) syncRejected(me, pending);
        return requests(me.advertiserId());
    }

    // ponytail: quét cả danh sách của SV4 rồi lọc theo id; đổi sang getRefund(id)/RefundRejectedEvent khi SV4 có.
    private void syncRejected(AdBookingService.Advertiser me, List<Map<String, Object>> pending) {
        var all = refunds.getRefundsList();
        for (var request : pending) {
            for (var refund : all) {
                boolean same = refund.getId().equals(text(request, "refund_request_id"))
                        && refund.getUserId().equals(String.valueOf(me.userId()));
                if (!same || !"REJECTED".equals(refund.getStatus())) continue;
                jdbc.update("UPDATE ad_cancellation_requests SET refund_decision = 'REJECTED', review_notes = ?, "
                                + "decided_at = ? WHERE cancellation_id = ? AND refund_decision = 'PENDING'",
                        refund.getReviewNotes(), refund.getResolvedAt(), request.get("cancellation_id"));
                notifications.notify(me.userId(), number(request, "campaign_id"), "AD_REFUND_REJECTED",
                        "Khoản hoàn bị từ chối",
                        Objects.toString(refund.getReviewNotes(), "Liên hệ kế toán để biết lý do"), refund.getId());
            }
        }
    }

    private List<CancellationRequest> requests(long advertiserId) {
        return jdbc.query("SELECT r.*, c.campaign_name FROM ad_cancellation_requests r "
                        + "JOIN ad_campaigns c ON c.campaign_id = r.campaign_id "
                        + "WHERE r.advertiser_id = ? ORDER BY r.cancellation_id DESC",
                (rs, i) -> new CancellationRequest(
                        rs.getString("cancellation_id"), rs.getString("campaign_id"), rs.getString("campaign_name"),
                        rs.getString("reason"), AdBookingService.time(rs, "effective_at"),
                        rs.getBigDecimal("paid_amount"), rs.getLong("total_days"), rs.getLong("unused_days"),
                        rs.getBigDecimal("proposed_amount"), rs.getString("refund_decision"),
                        rs.getString("refund_status"), rs.getBigDecimal("refunded_amount"),
                        rs.getString("review_notes"), AdBookingService.time(rs, "decided_at"),
                        AdBookingService.time(rs, "refunded_at")),
                advertiserId);
    }

    /** Ghép kết quả hoàn của SV4 với yêu cầu hủy qua refundId. Chiến dịch giữ nguyên CANCELLED. */
    @EventListener
    public void onRefundCompleted(RefundCompletedEvent event) {
        if (!"AD".equals(event.getTransactionType()) || event.getTargetId() == null) return;
        int changed = jdbc.update("UPDATE ad_cancellation_requests SET refund_decision = 'APPROVED', "
                        + "refund_status = 'REFUNDED', refunded_amount = ?, decided_at = ?, refunded_at = ? "
                        + "WHERE campaign_id = ? AND refund_request_id = ?",
                event.getRefundAmount(), event.getRefundedAt(), event.getRefundedAt(),
                event.getTargetId(), event.getRefundId());
        if (changed == 0) return;
        String refundId = String.valueOf(event.getRefundId());
        notifications.notify(event.getUserId(), event.getTargetId(), "AD_REFUND_APPROVED",
                "Khoản hoàn đã được duyệt", "Kế toán đã duyệt khoản hoàn của chiến dịch.", refundId);
        notifications.notify(event.getUserId(), event.getTargetId(), "AD_REFUNDED",
                "Đã hoàn tiền chiến dịch", String.format(Locale.forLanguageTag("vi-VN"), "Số tiền đã hoàn: %,.0f đ", event.getRefundAmount()), refundId);
    }
}
