package com.localpress.reader.repository;

import com.localpress.reader.dto.PublicSubscriptionPlanResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

// đọc gói đang bán cho trang /premium, không ghi vào bảng của tòa soạn
@Repository
@RequiredArgsConstructor
public class ReaderPlanRepository {

    private final JdbcTemplate jdbcTemplate;

    public List<PublicSubscriptionPlanResponse> findActive() {
        return jdbcTemplate.query("""
                SELECT p.plan_id, p.name, p.price, p.duration_days, p.has_ad_free, p.has_audio,
                       p.status, p.access_scope, p.category_id, c.name AS category_name
                FROM subscription_plans p
                LEFT JOIN categories c ON c.category_id = p.category_id
                WHERE p.status = 'ACTIVE'
                ORDER BY p.price ASC, p.plan_id ASC
                """, (rs, row) -> {
            long rawCategoryId = rs.getLong("category_id");
            boolean categoryMissing = rs.wasNull();
            return PublicSubscriptionPlanResponse.builder()
                    .id(rs.getLong("plan_id"))
                    .name(rs.getString("name"))
                    .price(rs.getBigDecimal("price"))
                    .durationDays(rs.getInt("duration_days"))
                    .hasAdFree(rs.getBoolean("has_ad_free"))
                    .hasAudio(rs.getBoolean("has_audio"))
                    .status(rs.getString("status"))
                    .accessScope(rs.getString("access_scope"))
                    .categoryId(categoryMissing ? null : rawCategoryId)
                    .categoryName(rs.getString("category_name"))
                    .build();
        });
    }
}
