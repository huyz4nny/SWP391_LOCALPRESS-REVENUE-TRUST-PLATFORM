package com.localpress.reader.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// repository của SV3 cho việc cấp và thu hồi quyền đọc khi tiền về hoặc khi hoàn tiền (UC034 UC035 UC056)
// luồng đi là ReaderEntitlementListener gọi vào đây -> đọc kiểm tra điều kiện trước -> rồi mới ghi bảng article_purchases hoặc subscriptions
// cố ý không gắn @Transactional ở lớp này để các hàm tham gia đúng transaction của webhook bên SV4
// mọi câu UPDATE đều có điều kiện trạng thái nên chạy lại nhiều lần vẫn an toàn (idempotent)
@Repository
@RequiredArgsConstructor
public class ReaderEntitlementRepository {

    private final JdbcTemplate jdbcTemplate;

    // bản ghi mua lẻ nhìn từ góc độ cấp quyền gồm chủ sở hữu giá đã chốt và trạng thái hiện tại
    public record PurchaseForGrant(Long purchaseId, Long userId, BigDecimal price, String accessStatus,
                                   Long grantedTransactionId) {
    }

    // Giá so sánh là locked_price lúc tạo đơn, không có thì giá plan hiện tại.
    public record SubscriptionForGrant(Long subscriptionId, Long userId, String status,
                                       BigDecimal planPrice, int durationDays,
                                       String accessScope, Long categoryId, Long grantedTransactionId) {
    }

    // block đọc bản ghi mua lẻ để kiểm tra trước khi cấp quyền
    public Optional<PurchaseForGrant> findPurchaseForGrant(Long purchaseId) {
        List<PurchaseForGrant> rows = jdbcTemplate.query(
                """
                SELECT purchase_id, user_id, purchase_price, access_status, granted_transaction_id
                FROM article_purchases WHERE purchase_id = ?
                """,
                (rs, i) -> new PurchaseForGrant(
                        rs.getLong("purchase_id"),
                        rs.getLong("user_id"),
                        rs.getBigDecimal("purchase_price"),
                        rs.getString("access_status"),
                        rs.getObject("granted_transaction_id", Long.class)),
                purchaseId);
        return rows.stream().findFirst();
    }

    // block chuyển bản ghi mua lẻ từ PENDING sang ACTIVE và trả về số dòng đổi được
    // trả 0 nghĩa là bản ghi không còn PENDING (đã cấp rồi) nên không làm gì thêm
    public int activatePurchase(Long purchaseId, LocalDateTime paidAt, Long transactionId) {
        return jdbcTemplate.update("""
                UPDATE article_purchases
                SET access_status = 'ACTIVE', purchased_at = ?, granted_transaction_id = ?
                WHERE purchase_id = ? AND access_status = 'PENDING'
                """, Timestamp.valueOf(paidAt), transactionId, purchaseId);
    }

    // block thu hồi quyền đọc bài lẻ khi hoàn toàn bộ tiền
    // chỉ thu hồi đúng bản ghi của đúng người và chỉ khi đang ACTIVE
    public int revokePurchase(Long purchaseId, Long userId) {
        return jdbcTemplate.update("""
                UPDATE article_purchases SET access_status = 'REVOKED'
                WHERE purchase_id = ? AND user_id = ? AND access_status = 'ACTIVE'
                """, purchaseId, userId);
    }

    // block đọc bản ghi gói kèm giá và thời hạn hiện tại của gói
    public Optional<SubscriptionForGrant> findSubscriptionForGrant(Long subscriptionId) {
        List<SubscriptionForGrant> rows = jdbcTemplate.query("""
                        SELECT s.subscription_id, s.user_id, s.status,
                               COALESCE(s.locked_price, p.price) AS price,
                               p.duration_days, p.access_scope, p.category_id, s.granted_transaction_id
                        FROM subscriptions s
                        JOIN subscription_plans p ON p.plan_id = s.plan_id
                        WHERE s.subscription_id = ?
                        """,
                (rs, i) -> new SubscriptionForGrant(
                        rs.getLong("subscription_id"),
                        rs.getLong("user_id"),
                        rs.getString("status"),
                        rs.getBigDecimal("price"),
                        rs.getInt("duration_days"),
                        rs.getString("access_scope"),
                        rs.getObject("category_id", Long.class),
                        rs.getObject("granted_transaction_id", Long.class)),
                subscriptionId);
        return rows.stream().findFirst();
    }

    // Ngày hết hạn muộn nhất của gói ACTIVE còn hạn mà phạm vi bao trùm gói mới.
    // ALL bao trùm mọi gói. CATEGORY chỉ bao trùm đúng chuyên mục đó, không đẩy lùi gói toàn trang.
    public Optional<LocalDate> findLatestActiveEndDate(Long userId, LocalDate today, String accessScope, Long categoryId) {
        List<LocalDate> rows = jdbcTemplate.query("""
                        SELECT MAX(s.end_date) AS latest_end
                        FROM subscriptions s
                        JOIN subscription_plans p ON p.plan_id = s.plan_id
                        WHERE s.user_id = ? AND s.status = 'ACTIVE' AND s.end_date >= ?
                          AND (
                            (p.access_scope = 'ALL' AND p.category_id IS NULL)
                            OR (? = 'CATEGORY' AND p.access_scope = 'CATEGORY' AND p.category_id = ?)
                          )
                        """,
                (rs, i) -> rs.getObject("latest_end", LocalDate.class),
                userId, Date.valueOf(today), accessScope, categoryId);
        return rows.stream().filter(d -> d != null).findFirst();
    }

    // block chuyển gói từ PENDING sang ACTIVE kèm ngày bắt đầu và kết thúc thật
    // trả 0 nghĩa là gói không còn PENDING (đã kích hoạt rồi) nên không làm gì thêm
    public int activateSubscription(Long subscriptionId, LocalDate startDate, LocalDate endDate, Long transactionId) {
        return jdbcTemplate.update("""
                UPDATE subscriptions
                SET status = 'ACTIVE', start_date = ?, end_date = ?, granted_transaction_id = ?
                WHERE subscription_id = ? AND status = 'PENDING'
                """, Date.valueOf(startDate), Date.valueOf(endDate), transactionId, subscriptionId);
    }

    // block hủy đúng kỳ gói bị hoàn toàn bộ tiền
    // kỳ gia hạn có giao dịch riêng nên không bị đụng tới
    public int cancelSubscription(Long subscriptionId, Long userId) {
        return jdbcTemplate.update("""
                UPDATE subscriptions SET status = 'CANCELLED'
                WHERE subscription_id = ? AND user_id = ? AND status = 'ACTIVE'
                """, subscriptionId, userId);
    }
}
