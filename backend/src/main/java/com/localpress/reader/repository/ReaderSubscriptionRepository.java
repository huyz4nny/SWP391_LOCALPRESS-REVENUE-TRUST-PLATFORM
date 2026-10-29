package com.localpress.reader.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

// đọc và tắt gia hạn gói của chính độc giả, không đụng bảng của kế toán
@Repository
@RequiredArgsConstructor
public class ReaderSubscriptionRepository {

    private final JdbcTemplate jdbcTemplate;

    public record SubscriptionRow(
            Long subscriptionId,
            Long planId,
            String planName,
            BigDecimal price,
            String accessScope,
            Long categoryId,
            String categoryName,
            LocalDate startDate,
            LocalDate endDate,
            String status,
            boolean autoRenew,
            boolean hasAdFree,
            boolean hasAudio
    ) {
    }

    // gói ACTIVE chưa qua end_date, kể cả kỳ nối tiếp chưa tới ngày bắt đầu
    public List<SubscriptionRow> findActiveNotExpired(Long userId, LocalDate today) {
        return jdbcTemplate.query("""
                SELECT s.subscription_id, s.plan_id, p.name, p.price, p.access_scope, p.category_id,
                       c.name AS category_name, s.start_date, s.end_date, s.status, s.auto_renew,
                       p.has_ad_free, p.has_audio
                FROM subscriptions s
                JOIN subscription_plans p ON p.plan_id = s.plan_id
                LEFT JOIN categories c ON c.category_id = p.category_id
                WHERE s.user_id = ? AND s.status = 'ACTIVE' AND s.end_date >= ?
                ORDER BY s.end_date DESC, s.subscription_id DESC
                """, (rs, row) -> mapRow(rs), userId, Date.valueOf(today));
    }

    public Optional<SubscriptionRow> findOwned(Long userId, Long subscriptionId) {
        List<SubscriptionRow> rows = jdbcTemplate.query("""
                SELECT s.subscription_id, s.plan_id, p.name, p.price, p.access_scope, p.category_id,
                       c.name AS category_name, s.start_date, s.end_date, s.status, s.auto_renew,
                       p.has_ad_free, p.has_audio
                FROM subscriptions s
                JOIN subscription_plans p ON p.plan_id = s.plan_id
                LEFT JOIN categories c ON c.category_id = p.category_id
                WHERE s.subscription_id = ? AND s.user_id = ?
                """, (rs, row) -> mapRow(rs), subscriptionId, userId);
        return rows.stream().findFirst();
    }

    // chỉ tắt cờ, không đổi status và không đổi ngày
    public int disableAutoRenew(Long subscriptionId, Long userId) {
        return jdbcTemplate.update("""
                UPDATE subscriptions SET auto_renew = FALSE
                WHERE subscription_id = ? AND user_id = ? AND status = 'ACTIVE' AND auto_renew = TRUE
                """, subscriptionId, userId);
    }

    private static SubscriptionRow mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        long rawCategoryId = rs.getLong("category_id");
        boolean categoryMissing = rs.wasNull();
        return new SubscriptionRow(
                rs.getLong("subscription_id"),
                rs.getLong("plan_id"),
                rs.getString("name"),
                rs.getBigDecimal("price"),
                rs.getString("access_scope"),
                categoryMissing ? null : rawCategoryId,
                rs.getString("category_name"),
                rs.getObject("start_date", LocalDate.class),
                rs.getObject("end_date", LocalDate.class),
                rs.getString("status"),
                rs.getBoolean("auto_renew"),
                rs.getBoolean("has_ad_free"),
                rs.getBoolean("has_audio"));
    }
}
