package com.localpress.advertising;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * UC010: suy ra chiến dịch đang ở bước nào (dùng chung cho dashboard, chi tiết booking, thông báo).
 * RUNNING phải khớp đúng điều kiện phát của SV5 (AdServingRepository.eligible), kể cả khi bản APPROVED
 * mới nhất bị quét chặn thì SV5 không phát bản nào. SV5 đổi điều kiện thì sửa ở đây cùng lúc.
 */
@Component
public class CampaignStage {
    private final JdbcTemplate jdbc;

    public CampaignStage(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record State(String stage, String reason) {}

    /** Bản banner được phát: đã duyệt và tới giờ hiệu lực (giờ VN), như AdServingRepository.eligible của SV5. */
    static final String IN_EFFECT = "review_status = 'APPROVED' AND (requested_effective_at IS NULL "
            + "OR requested_effective_at <= CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))";

    // Mỗi dòng: campaign + slot + bản đang có hiệu lực, version cao nhất (approved_*) + bản mới nhất bất kỳ (latest_*).
    private static final String SELECT = """
            SELECT c.*, s.name slot_name, s.status slot_status, s.dimensions,
                   v.creative_id approved_creative_id, v.version_number approved_version, v.scan_status,
                   latest.review_status latest_review, latest.rejection_reason creative_rejection
            FROM ad_campaigns c
            JOIN ad_slots s ON s.slot_id = c.slot_id
            LEFT JOIN ad_creatives v ON v.campaign_id = c.campaign_id
                 AND v.version_number = (SELECT MAX(n.version_number) FROM ad_creatives n
                                         WHERE n.campaign_id = c.campaign_id AND n.review_status = 'APPROVED'
                                           AND (n.requested_effective_at IS NULL OR n.requested_effective_at
                                                <= CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')))
            LEFT JOIN ad_creatives latest ON latest.campaign_id = c.campaign_id
                 AND latest.version_number = (SELECT MAX(n.version_number) FROM ad_creatives n
                                              WHERE n.campaign_id = c.campaign_id)
            """;

    List<Map<String, Object>> rows(long advertiserId, Long campaignId) {
        if (campaignId == null) {
            return jdbc.queryForList(SELECT + " WHERE c.advertiser_id = ? ORDER BY c.campaign_id DESC", advertiserId);
        }
        return jdbc.queryForList(SELECT + " WHERE c.advertiser_id = ? AND c.campaign_id = ?", advertiserId, campaignId);
    }

    State forCampaign(long campaignId) {
        return derive(jdbc.queryForMap(SELECT + " WHERE c.campaign_id = ?", campaignId), today());
    }

    LocalDate today() {
        return jdbc.queryForObject("SELECT CURRENT_DATE()", LocalDate.class);
    }

    /** Thứ tự kiểm tra là thứ tự ưu tiên: trạng thái đóng trước, rồi lần lượt các bước của vòng đời. */
    static State derive(Map<String, Object> c, LocalDate today) {
        String status = text(c, "status");
        if (status.equals("CANCELLED")) return new State("CANCELLED", "Chiến dịch đã hủy, không thể chạy lại");
        if (status.equals("REJECTED")) return new State("REJECTED", text(c, "rejection_reason"));
        if (!text(c, "payment_issue").isBlank()) {
            return new State("PAYMENT_ISSUE", "Thanh toán cần xử lý: " + text(c, "payment_issue"));
        }
        // Chỉ SUSPENDED mới là tạm dừng (tòa soạn/hệ thống dừng chiến dịch đã được phép chạy).
        if (status.equals("SUSPENDED")) return new State("PAUSED", "Chiến dịch đang tạm dừng");
        if (status.equals("COMPLETED") || date(c, "end_date").isBefore(today)) {
            return new State("ENDED", "Đã kết thúc lịch quảng cáo");
        }
        if (!text(c, "quotation_status").equals("ACCEPTED")) {
            return new State("QUOTE_PENDING", "Chờ báo giá hoặc xác nhận báo giá");
        }
        if (!text(c, "payment_status").equals("PAID")) {
            return new State("AWAITING_PAYMENT", "Chờ thanh toán theo báo giá đã xác nhận");
        }
        if (text(c, "contract_reference").isBlank()) {
            return new State("AWAITING_CONTRACT", "Chờ tòa soạn phát hành hợp đồng");
        }
        if (c.get("approved_creative_id") == null) {
            String latest = text(c, "latest_review");
            String reason = latest.equals("REJECTED") ? "Banner bị từ chối: " + text(c, "creative_rejection")
                    : latest.equals("PENDING") ? "Banner đang chờ duyệt"
                    : "Chưa có banner được duyệt";
            return new State("AWAITING_CREATIVE", reason);
        }
        String scan = text(c, "scan_status");
        if (!scan.isBlank() && !scan.equals("SAFE")) {
            return new State("AWAITING_CREATIVE", "Banner bị hệ thống quét chặn");
        }
        // Đủ điều kiện về tiền, hợp đồng, banner nhưng tòa soạn chưa kích hoạt: chưa từng chạy nên không gọi là tạm dừng.
        if (!(status.equals("APPROVED") || status.equals("ACTIVE"))) {
            return new State("AWAITING_ACTIVATION", "Chờ tòa soạn kích hoạt chiến dịch");
        }
        if (!text(c, "slot_status").equals("ACTIVE")) {
            return new State("AWAITING_ACTIVATION", "Vị trí quảng cáo đang tạm tắt");
        }
        if (date(c, "start_date").isAfter(today)) return new State("SCHEDULED", "Đủ điều kiện, chờ đến lịch phát");
        return new State("RUNNING", "Đủ điều kiện phát quảng cáo");
    }

    static String text(Map<String, Object> m, String key) {
        return m.get(key) == null ? "" : m.get(key).toString();
    }

    static LocalDate date(Map<String, Object> m, String key) {
        return ((java.sql.Date) m.get(key)).toLocalDate();
    }

    static BigDecimal money(Map<String, Object> m, String key) {
        return m.get(key) == null ? BigDecimal.ZERO : new BigDecimal(m.get(key).toString());
    }

    static long number(Map<String, Object> m, String key) {
        return m.get(key) == null ? 0 : ((Number) m.get(key)).longValue();
    }
}
