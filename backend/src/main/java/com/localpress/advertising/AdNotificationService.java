package com.localpress.advertising;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static com.localpress.advertising.CampaignStage.derive;
import static com.localpress.advertising.CampaignStage.number;
import static com.localpress.advertising.CampaignStage.text;

/**
 * UC014: thông báo trong app cho doanh nghiệp. dedup_key = TYPE:campaignId:version, INSERT IGNORE nên
 * ghi lặp không tạo bản trùng. Chỉ đọc được thông báo của chính mình (SRS: Notification ownership).
 */
@Service
public class AdNotificationService {
    private static final String MINE = "user_id = ? AND channel = 'IN_APP' AND LEFT(notification_type, 3) = 'AD_'";

    private final JdbcTemplate jdbc;
    private final CampaignStage stages;

    public AdNotificationService(JdbcTemplate jdbc, CampaignStage stages) {
        this.jdbc = jdbc;
        this.stages = stages;
    }

    public record Notification(String id, String type, String title, String content, String link, boolean read,
                               LocalDateTime createdAt) {}

    public record NotificationPage(List<Notification> items, long total, int page, int size) {}

    void notify(long userId, long campaignId, String type, String title, String content, String version) {
        jdbc.update("INSERT IGNORE INTO notifications "
                        + "(user_id, notification_type, channel, title, content, dedup_key, delivery_status) "
                        + "VALUES (?, ?, 'IN_APP', ?, ?, ?, 'SENT')",
                userId, type, title, content, type + ":" + campaignId + ":" + version);
    }

    long userId(String email) {
        return jdbc.query("SELECT user_id FROM users WHERE email = ? AND role = 'ADVERTISER' AND status = 'ACTIVE'",
                        (rs, r) -> rs.getLong(1), email)
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ doanh nghiệp được xem thông báo"));
    }

    /**
     * Mốc do SV2 quyết định (báo giá, duyệt banner) và mốc theo ngày (bắt đầu, tạm dừng, kết thúc) chưa có event.
     * ponytail: đồng bộ khi doanh nghiệp mở app nên thời điểm thông báo = lúc mở app; đổi sang event khi SV2 phát.
     */
    void sync(String email) {
        long user = userId(email);
        var advertisers = jdbc.query("SELECT advertiser_id FROM advertisers WHERE user_id = ?",
                (rs, r) -> rs.getLong(1), user);
        if (advertisers.isEmpty()) return;
        long advertiserId = advertisers.get(0);
        var today = stages.today();

        for (var c : stages.rows(advertiserId, null)) {
            long id = number(c, "campaign_id");
            String name = text(c, "campaign_name");
            if (number(c, "quote_version") > 0) {
                notify(user, id, "AD_QUOTE", "Báo giá mới",
                        name + " có báo giá phiên bản " + text(c, "quote_version"), text(c, "quote_version"));
            }
            var state = derive(c, today);
            switch (state.stage()) {
                case "RUNNING" -> notify(user, id, "AD_START", "Chiến dịch bắt đầu chạy", name, "1");
                case "ENDED" -> notify(user, id, "AD_END", "Chiến dịch kết thúc", name, "1");
                case "PAUSED" -> {
                    // Mỗi lần tạm dừng (một dòng audit) là một thông báo riêng.
                    Long auditId = jdbc.queryForObject("SELECT COALESCE(MAX(audit_id), 0) FROM audit_logs "
                            + "WHERE target_type = 'AD_CAMPAIGN' AND target_id = ? AND (action = 'AD_CAMPAIGN_SUSPENDED' "
                            + "OR JSON_UNQUOTE(JSON_EXTRACT(new_value, '$.status')) = 'SUSPENDED')", Long.class, id);
                    notify(user, id, "AD_PAUSE", "Chiến dịch tạm dừng", name + ": " + state.reason(), String.valueOf(auditId));
                }
                default -> { }
            }
        }

        jdbc.query("SELECT c.campaign_id, c.campaign_name, v.creative_id, v.review_status, v.rejection_reason "
                        + "FROM ad_creatives v JOIN ad_campaigns c ON c.campaign_id = v.campaign_id "
                        + "WHERE c.advertiser_id = ? AND v.review_status IN ('APPROVED', 'REJECTED', 'BLOCKED')",
                rs -> {
                    String status = rs.getString("review_status");
                    String reason = rs.getString("rejection_reason");
                    notify(user, rs.getLong("campaign_id"), "AD_CREATIVE",
                            status.equals("APPROVED") ? "Banner được duyệt" : "Banner bị từ chối",
                            rs.getString("campaign_name") + (reason == null ? "" : ": " + reason),
                            rs.getLong("creative_id") + ":" + status);
                },
                advertiserId);
    }

    public NotificationPage list(String email, int page, int size) {
        if (page < 0 || size < 1 || size > 100 || page > 1_000_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phân trang không hợp lệ");
        }
        sync(email);
        long user = userId(email);
        var items = jdbc.query("SELECT * FROM notifications WHERE " + MINE
                        + " ORDER BY notification_id DESC LIMIT ? OFFSET ?",
                (rs, r) -> new Notification(rs.getString("notification_id"), rs.getString("notification_type"),
                        rs.getString("title"), rs.getString("content"), link(rs.getString("dedup_key")),
                        rs.getBoolean("is_read"), rs.getTimestamp("created_at").toLocalDateTime()),
                user, size, (long) page * size);
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE " + MINE, Long.class, user);
        return new NotificationPage(items, total, page, size);
    }

    /** dedup_key TYPE:campaignId:version -> link tới booking; không có campaign thì về trang yêu cầu. */
    private static String link(String dedupKey) {
        String[] parts = dedupKey == null ? new String[0] : dedupKey.split(":");
        return parts.length > 1 && parts[1].matches("[0-9]+") ? "/advertiser/bookings/" + parts[1] : "/advertiser/requests";
    }

    public long unreadCount(String email) {
        sync(email);
        return jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE " + MINE + " AND is_read = FALSE",
                Long.class, userId(email));
    }

    public void markRead(String email, long id) {
        long user = userId(email);
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE notification_id = ? AND " + MINE,
                Long.class, id, user);
        if (count == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông báo");
        jdbc.update("UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?", id, user);
    }

    public void markAllRead(String email) {
        jdbc.update("UPDATE notifications SET is_read = TRUE WHERE " + MINE, userId(email));
    }
}
