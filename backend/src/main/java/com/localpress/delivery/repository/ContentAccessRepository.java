package com.localpress.delivery.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.List;
import java.util.Objects;

@Repository
@RequiredArgsConstructor
public class ContentAccessRepository {
    private final JdbcTemplate jdbc;

    public record PublishedArticle(Long id, Long categoryId, String accessType) {}

    public record SubscriptionGrant(String status, LocalDate startDate, LocalDate endDate,
                                    String scope, Long categoryId) {
        public boolean covers(Long articleCategoryId, LocalDate today) {
            return "ACTIVE".equals(status) && startDate != null && endDate != null
                    && !today.isBefore(startDate) && !today.isAfter(endDate)
                    && (("ALL".equals(scope) && categoryId == null)
                        || ("CATEGORY".equals(scope) && categoryId != null
                            && Objects.equals(categoryId, articleCategoryId)));
        }
    }

    public Optional<PublishedArticle> findPublishedArticle(Long articleId) {
        return jdbc.query("""
                SELECT a.article_id, a.category_id, a.access_type
                FROM articles a
                JOIN article_versions v ON v.article_id = a.article_id
                    AND v.version_number = a.published_version
                WHERE a.article_id = ? AND a.status = 'PUBLISHED'
                """, (rs, row) -> new PublishedArticle(rs.getLong("article_id"),
                rs.getObject("category_id", Long.class), rs.getString("access_type")), articleId)
                .stream().findFirst();
    }

    public boolean hasActivePurchase(Long userId, Long articleId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM article_purchases
                    WHERE user_id = ? AND article_id = ? AND access_status = 'ACTIVE')
                """, Boolean.class, userId, articleId));
    }

    public List<SubscriptionGrant> findSubscriptions(Long userId) {
        // Plan status controls new sales; existing ACTIVE subscriptions keep their purchased rights.
        return jdbc.query("""
                SELECT s.status, s.start_date, s.end_date, p.access_scope, p.category_id
                FROM subscriptions s
                JOIN subscription_plans p ON p.plan_id = s.plan_id
                WHERE s.user_id = ? AND s.status = 'ACTIVE'
                """, (rs, row) -> new SubscriptionGrant(rs.getString("status"),
                rs.getObject("start_date", LocalDate.class), rs.getObject("end_date", LocalDate.class),
                rs.getString("access_scope"), rs.getObject("category_id", Long.class)), userId);
    }
}
