package com.localpress.reader.repository;

import com.localpress.reader.dto.ReaderNotificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

// bảng notifications của độc giả (SV3):
//   - UC040: bài mới trong chuyên mục theo dõi (IN_APP)
//   - UC046: kết quả hoàn tiền (IN_APP + một dòng EMAIL ghi lại gửi mail thành công hay thất bại)
// dedup_key là khóa unique nên INSERT IGNORE chặn ghi trùng khi một sự kiện bị xử lý hai lần
@Repository
@RequiredArgsConstructor
public class ReaderNotificationRepository {

    public static final String TYPE_ARTICLE_PUBLISHED = "ARTICLE_PUBLISHED";
    public static final String TYPE_REFUND_COMPLETED = "REFUND_COMPLETED";
    public static final String TYPE_REFUND_REJECTED = "REFUND_REJECTED";

    private static final List<String> READER_TYPES =
            List.of(TYPE_ARTICLE_PUBLISHED, TYPE_REFUND_COMPLETED, TYPE_REFUND_REJECTED);

    private final JdbcTemplate jdbcTemplate;

    // thông tin để viết nội dung thông báo hoàn tiền: mã đơn và tên bài / tên gói
    public record RefundContext(String orderCode, String itemName) {
    }

    public List<Long> findFollowerIds(long categoryId) {
        return jdbcTemplate.query(
                "SELECT user_id FROM category_follows WHERE category_id = ?",
                (rs, row) -> rs.getLong(1),
                categoryId);
    }

    // UC040: thông báo bài mới, giữ chữ ký cũ cho ArticlePublishedNotificationService
    public int insertInApp(long userId, String title, String content, String dedupKey) {
        return insertInApp(userId, TYPE_ARTICLE_PUBLISHED, title, content, null, dedupKey);
    }

    // trả 1 nếu ghi mới, 0 nếu dedup_key đã có (sự kiện đã được xử lý trước đó)
    public int insertInApp(long userId, String type, String title, String content, String linkUrl, String dedupKey) {
        return jdbcTemplate.update("""
                INSERT IGNORE INTO notifications
                    (user_id, notification_type, channel, title, content, link_url, delivery_status, is_read, dedup_key)
                VALUES (?, ?, 'IN_APP', ?, ?, ?, 'SENT', FALSE, ?)
                """, userId, type, title, content, linkUrl, dedupKey);
    }

    // ghi lại một lần gửi email (SENT hoặc FAILED) để tra cứu, không hiện trong danh sách của độc giả
    public int insertEmailLog(long userId, String type, String title, String content, boolean sent, String dedupKey) {
        return jdbcTemplate.update("""
                INSERT IGNORE INTO notifications
                    (user_id, notification_type, channel, title, content, delivery_status, is_read, dedup_key)
                VALUES (?, ?, 'EMAIL', ?, ?, ?, TRUE, ?)
                """, userId, type, title, content, sent ? "SENT" : "FAILED", dedupKey);
    }

    public Optional<String> findActiveUserEmail(long userId) {
        return jdbcTemplate.query(
                "SELECT email FROM users WHERE user_id = ? AND status = 'ACTIVE'",
                (rs, row) -> rs.getString(1),
                userId).stream().findFirst();
    }

    // mã đơn (transactions.gateway_transaction_id) và tên bài lẻ hoặc tên gói của đơn gốc
    public Optional<RefundContext> findRefundContext(long originalTransactionId) {
        return jdbcTemplate.query("""
                SELECT t.gateway_transaction_id AS order_code,
                       COALESCE(a.title, sp.name) AS item_name
                FROM transactions t
                LEFT JOIN article_purchases ap ON ap.purchase_id = t.purchase_id
                LEFT JOIN articles a ON a.article_id = ap.article_id
                LEFT JOIN subscriptions s ON s.subscription_id = t.subscription_id
                LEFT JOIN subscription_plans sp ON sp.plan_id = s.plan_id
                WHERE t.transaction_id = ?
                """,
                (rs, row) -> new RefundContext(rs.getString("order_code"), rs.getString("item_name")),
                originalTransactionId).stream().findFirst();
    }

    // danh sách thông báo trong app của độc giả, mới nhất lên đầu
    public List<ReaderNotificationResponse> findInAppForUser(long userId, int limit) {
        return jdbcTemplate.query("""
                SELECT notification_id, notification_type, title, content, link_url, is_read, created_at
                FROM notifications
                WHERE user_id = ? AND channel = 'IN_APP' AND notification_type IN (?, ?, ?)
                ORDER BY created_at DESC, notification_id DESC
                LIMIT ?
                """,
                (rs, row) -> {
                    Timestamp createdAt = rs.getTimestamp("created_at");
                    return new ReaderNotificationResponse(
                            rs.getLong("notification_id"),
                            rs.getString("notification_type"),
                            rs.getString("title"),
                            rs.getString("content"),
                            rs.getString("link_url"),
                            rs.getBoolean("is_read"),
                            createdAt == null ? null : createdAt.toLocalDateTime().toString());
                },
                userId, READER_TYPES.get(0), READER_TYPES.get(1), READER_TYPES.get(2), limit);
    }

    public long countUnread(long userId) {
        Long count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM notifications
                WHERE user_id = ? AND channel = 'IN_APP' AND is_read = FALSE AND notification_type IN (?, ?, ?)
                """, Long.class, userId, READER_TYPES.get(0), READER_TYPES.get(1), READER_TYPES.get(2));
        return count == null ? 0 : count;
    }

    // chỉ đánh dấu thông báo của chính người đó (chống sửa thông báo người khác qua id)
    public int markRead(long userId, long notificationId) {
        return jdbcTemplate.update(
                "UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ? AND channel = 'IN_APP'",
                notificationId, userId);
    }

    public int markAllRead(long userId) {
        return jdbcTemplate.update(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND channel = 'IN_APP' AND is_read = FALSE",
                userId);
    }
}
