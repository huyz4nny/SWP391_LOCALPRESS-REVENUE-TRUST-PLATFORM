package com.localpress.reader.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

// repository của SV3 cho việc mua lẻ bài và đăng ký gói cước ở UC034 và UC035
// luồng đi là ReaderPurchaseService gọi vào đây -> đọc hoặc ghi các bảng articles article_versions article_purchases subscription_plans subscriptions
// dùng JdbcTemplate vì chỉ cần vài câu sql ngắn và không muốn thêm entity cho bảng mà module khác cũng đang dùng
@Repository
@RequiredArgsConstructor
public class ReaderPurchaseRepository {

    private final JdbcTemplate jdbcTemplate;

    // một bài viết nhìn từ góc độ bán lẻ gồm loại truy cập giá và tên bản đã xuất bản
    public record ArticleForSale(Long articleId, String accessType, String status,
                                 BigDecimal singlePrice, Long categoryId, String title) {
    }

    // một dòng trong article_purchases
    public record PurchaseRow(Long purchaseId, String accessStatus) {
    }

    // một gói cước trong subscription_plans
    public record PlanRow(Long planId, String name, BigDecimal price, String status) {
    }

    // một gói đang có hiệu lực của độc giả dùng để xem gói đó có bao trùm bài định mua không
    public record ActiveSubscription(Long subscriptionId, Long planId, LocalDate startDate, LocalDate endDate,
                                     String accessScope, Long categoryId) {
    }

    // block lấy thông tin bán lẻ của bài kèm tên bản đã xuất bản
    // dùng left join để bài chưa có bản xuất bản vẫn trả về một dòng và service sẽ từ chối sau
    public Optional<ArticleForSale> findArticleForSale(Long articleId) {
        List<ArticleForSale> rows = jdbcTemplate.query("""
                        SELECT a.article_id, a.access_type, a.status, a.single_price, a.category_id, v.title
                        FROM articles a
                        LEFT JOIN article_versions v
                               ON v.article_id = a.article_id AND v.version_number = a.published_version
                        WHERE a.article_id = ?
                        """,
                (rs, i) -> new ArticleForSale(
                        rs.getLong("article_id"),
                        rs.getString("access_type"),
                        rs.getString("status"),
                        rs.getBigDecimal("single_price"),
                        rs.getObject("category_id", Long.class),
                        rs.getString("title")),
                articleId);
        return rows.stream().findFirst();
    }

    // block tìm bản ghi mua lẻ của đúng người này với đúng bài này
    // bảng có ràng buộc duy nhất user_id và article_id nên chỉ có tối đa một dòng
    public Optional<PurchaseRow> findPurchase(Long userId, Long articleId) {
        List<PurchaseRow> rows = jdbcTemplate.query(
                "SELECT purchase_id, access_status FROM article_purchases WHERE user_id = ? AND article_id = ?",
                (rs, i) -> new PurchaseRow(rs.getLong("purchase_id"), rs.getString("access_status")),
                userId, articleId);
        return rows.stream().findFirst();
    }

    // block tạo bản ghi mua lẻ mới ở trạng thái PENDING và trả về purchase_id
    // nếu hai request chạy cùng lúc thì ràng buộc duy nhất sẽ ném DuplicateKeyException để service xử lý
    public Long insertPendingPurchase(Long userId, Long articleId, BigDecimal price) {
        return insertAndReturnId(
                "INSERT INTO article_purchases (user_id, article_id, purchase_price, access_status) VALUES (?, ?, ?, 'PENDING')",
                userId, articleId, price);
    }

    // block đưa bản ghi cũ (đang chờ hoặc đã thu hồi) về PENDING với giá hiện tại để mua lại
    // chỉ cập nhật khi chưa ACTIVE để không bao giờ hạ cấp một quyền đã được trả tiền
    public int resetPurchaseToPending(Long purchaseId, BigDecimal price) {
        return jdbcTemplate.update("""
                UPDATE article_purchases
                SET purchase_price = ?, access_status = 'PENDING', purchased_at = CURRENT_TIMESTAMP
                WHERE purchase_id = ? AND access_status <> 'ACTIVE'
                """, price, purchaseId);
    }

    // block lấy gói cước theo id
    public Optional<PlanRow> findPlan(Long planId) {
        List<PlanRow> rows = jdbcTemplate.query(
                "SELECT plan_id, name, price, status FROM subscription_plans WHERE plan_id = ?",
                (rs, i) -> new PlanRow(
                        rs.getLong("plan_id"),
                        rs.getString("name"),
                        rs.getBigDecimal("price"),
                        rs.getString("status")),
                planId);
        return rows.stream().findFirst();
    }

    // block lấy các gói ACTIVE của độc giả đang trong thời hạn tại ngày today
    // gói gia hạn nối tiếp có ngày bắt đầu ở tương lai nên bị loại ra đúng như mong muốn
    public List<ActiveSubscription> findActiveSubscriptions(Long userId, LocalDate today) {
        return jdbcTemplate.query("""
                        SELECT s.subscription_id, s.plan_id, s.start_date, s.end_date, p.access_scope, p.category_id
                        FROM subscriptions s
                        JOIN subscription_plans p ON p.plan_id = s.plan_id
                        WHERE s.user_id = ? AND s.status = 'ACTIVE' AND s.start_date <= ? AND s.end_date >= ?
                        """,
                (rs, i) -> new ActiveSubscription(
                        rs.getLong("subscription_id"),
                        rs.getLong("plan_id"),
                        rs.getObject("start_date", LocalDate.class),
                        rs.getObject("end_date", LocalDate.class),
                        rs.getString("access_scope"),
                        rs.getObject("category_id", Long.class)),
                userId, Date.valueOf(today), Date.valueOf(today));
    }

    // block tìm gói đang chờ thanh toán của người này với đúng gói này để dùng lại thay vì tạo thêm
    public Optional<Long> findPendingSubscriptionId(Long userId, Long planId) {
        List<Long> rows = jdbcTemplate.query("""
                        SELECT subscription_id FROM subscriptions
                        WHERE user_id = ? AND plan_id = ? AND status = 'PENDING'
                        ORDER BY subscription_id DESC
                        """,
                (rs, i) -> rs.getLong("subscription_id"),
                userId, planId);
        return rows.stream().findFirst();
    }

    // block tạo bản ghi gói mới ở trạng thái PENDING và bật gia hạn
    // cột auto_renew mặc định false, nếu không bật ở đây thì độc giả không có gì để tắt sau khi trả tiền
    // start_date và end_date là cột bắt buộc nên ghi tạm bằng ngày tạo và sẽ được ghi đè bằng ngày thật khi thanh toán xong
    public Long insertPendingSubscription(Long userId, Long planId, LocalDate today) {
        return insertAndReturnId("""
                INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, auto_renew)
                VALUES (?, ?, ?, ?, 'PENDING', TRUE)
                """, userId, planId, Date.valueOf(today), Date.valueOf(today));
    }

    // block làm mới ngày tạm của bản ghi chờ cũ và chỉ động vào bản ghi vẫn còn PENDING
    public int refreshPendingSubscription(Long subscriptionId, LocalDate today) {
        return jdbcTemplate.update("""
                UPDATE subscriptions SET start_date = ?, end_date = ?, auto_renew = TRUE
                WHERE subscription_id = ? AND status = 'PENDING'
                """, Date.valueOf(today), Date.valueOf(today), subscriptionId);
    }

    // hàm dùng chung để chạy câu INSERT rồi lấy id tự tăng vừa sinh ra
    private Long insertAndReturnId(String sql, Object... args) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) {
                ps.setObject(i + 1, args[i]);
            }
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Không lấy được id vừa tạo");
        }
        return key.longValue();
    }
}
