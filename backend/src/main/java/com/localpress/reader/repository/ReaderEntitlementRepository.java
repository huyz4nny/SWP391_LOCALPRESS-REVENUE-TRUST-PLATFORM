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
    public record PurchaseForGrant(Long purchaseId, Long userId, BigDecimal price, String accessStatus) {
    }

    // bản ghi gói nhìn từ góc độ cấp quyền gồm chủ sở hữu trạng thái giá hiện tại của gói và số ngày
    public record SubscriptionForGrant(Long subscriptionId, Long userId, String status,
                                       BigDecimal planPrice, int durationDays) {
    }

    // block đọc bản ghi mua lẻ để kiểm tra trước khi cấp quyền
    public Optional<PurchaseForGrant> findPurchaseForGrant(Long purchaseId) {
        List<PurchaseForGrant> rows = jdbcTemplate.query(
                "SELECT purchase_id, user_id, purchase_price, access_status FROM article_purchases WHERE purchase_id = ?",
                (rs, i) -> new PurchaseForGrant(
                        rs.getLong("purchase_id"),
                        rs.getLong("user_id"),
                        rs.getBigDecimal("purchase_price"),
                        rs.getString("access_status")),
                purchaseId);
        return rows.stream().findFirst();
    }

    // block chuyển bản ghi mua lẻ từ PENDING sang ACTIVE và trả về số dòng đổi được
    // trả 0 nghĩa là bản ghi không còn PENDING (đã cấp rồi) nên không làm gì thêm
    public int activatePurchase(Long purchaseId, LocalDateTime paidAt) {
        return jdbcTemplate.update("""
                UPDATE article_purchases SET access_status = 'ACTIVE', purchased_at = ?
                WHERE purchase_id = ? AND access_status = 'PENDING'
                """, Timestamp.valueOf(paidAt), purchaseId);
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
                        SELECT s.subscription_id, s.user_id, s.status, p.price, p.duration_days
                        FROM subscriptions s
                        JOIN subscription_plans p ON p.plan_id = s.plan_id
                        WHERE s.subscription_id = ?
                        """,
                (rs, i) -> new SubscriptionForGrant(
                        rs.getLong("subscription_id"),
                        rs.getLong("user_id"),
                        rs.getString("status"),
                        rs.getBigDecimal("price"),
                        rs.getInt("duration_days")),
                subscriptionId);
        return rows.stream().findFirst();
    }

    // block tìm ngày hết hạn muộn nhất trong các gói ACTIVE chưa hết hạn của độc giả
    // dùng để gói mới nối tiếp phía sau thay vì chạy chồng lên gói cũ
    // hiện chỉ có gói toàn trang nên tính mọi gói ACTIVE
    // khi migration V8 có phạm vi chuyên mục thì thêm điều kiện chỉ lấy gói có phạm vi bao trùm gói mới
    public Optional<LocalDate> findLatestActiveEndDate(Long userId, LocalDate today) {
        List<LocalDate> rows = jdbcTemplate.query("""
                        SELECT MAX(end_date) AS latest_end
                        FROM subscriptions
                        WHERE user_id = ? AND status = 'ACTIVE' AND end_date >= ?
                        """,
                (rs, i) -> rs.getObject("latest_end", LocalDate.class),
                userId, Date.valueOf(today));
        return rows.stream().filter(d -> d != null).findFirst();
    }

    // block chuyển gói từ PENDING sang ACTIVE kèm ngày bắt đầu và kết thúc thật
    // trả 0 nghĩa là gói không còn PENDING (đã kích hoạt rồi) nên không làm gì thêm
    public int activateSubscription(Long subscriptionId, LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.update("""
                UPDATE subscriptions SET status = 'ACTIVE', start_date = ?, end_date = ?
                WHERE subscription_id = ? AND status = 'PENDING'
                """, Date.valueOf(startDate), Date.valueOf(endDate), subscriptionId);
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
