package com.localpress.finance.demostore;

import com.localpress.finance.dto.request.CreateOrderRequest;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.shared.event.PaymentSuccessEvent;
import com.localpress.shared.event.RefundCompletedEvent;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Cửa hàng thử CHỈ dùng khi demo / review luồng thanh toán SV4 lúc phân hệ độc giả (SV3) chưa tạo đơn từ server
 * và chưa nghe sự kiện. Đóng vai module nguồn: tạo bản ghi chờ, lấy giá từ DB, gọi createOrder từ server (Rule 4),
 * nghe PaymentSuccessEvent / RefundCompletedEvent để mở / thu hồi quyền.
 *
 * Chỉ chạy ở profile dev khi bật localpress.demo-store.enabled=true (đặt trong config/application-secrets.yml, gitignored).
 * Chỉ đụng các đơn có mô tả bắt đầu bằng DEMO_PREFIX nên không lẫn với đơn thật của SV3.
 * Ghi article_purchases / subscriptions là việc của SV3 (Rule 17): xóa package này khi SV3 làm xong phần của mình.
 */
@Slf4j
@Service
@Profile("dev")
@ConditionalOnProperty(name = "localpress.demo-store.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoStoreService {

    static final String DEMO_PREFIX = "[Thử] ";

    private final JdbcTemplate jdbc;
    private final PaymentProcessingService paymentProcessingService;
    private final TransactionRepository transactionRepository;

    /** Bài PREMIUM đã xuất bản, gói đang bán, kèm trạng thái quyền hiện tại của người xem. */
    public Map<String, Object> catalog(Long userId) {
        List<Map<String, Object>> articles = jdbc.queryForList("""
                SELECT a.article_id AS id, a.slug, v.title, a.single_price AS price,
                       (SELECT p.access_status FROM article_purchases p
                         WHERE p.user_id = ? AND p.article_id = a.article_id) AS accessStatus
                FROM articles a
                JOIN article_versions v ON v.article_id = a.article_id AND v.version_number = a.published_version
                WHERE a.status = 'PUBLISHED' AND a.access_type = 'PREMIUM' AND a.single_price > 0
                ORDER BY a.article_id
                """, userId);
        List<Map<String, Object>> plans = jdbc.queryForList("""
                SELECT p.plan_id AS id, p.name AS title, p.price, p.duration_days AS durationDays,
                       (SELECT s.status FROM subscriptions s WHERE s.user_id = ? AND s.plan_id = p.plan_id
                         ORDER BY s.subscription_id DESC LIMIT 1) AS accessStatus
                FROM subscription_plans p
                WHERE p.status = 'ACTIVE' AND p.price > 0
                ORDER BY p.price
                """, userId);
        return Map.of("articles", articles, "plans", plans);
    }

    /**
     * Bấm "Mua": tạo bản ghi chờ, giá lấy từ DB (không tin giá trình duyệt gửi), rồi tạo đơn từ server.
     * Trình duyệt chỉ gửi loại + id món hàng.
     */
    @Transactional
    public OrderCreateResponse purchase(Long userId, String type, Long itemId) {
        if (itemId == null) {
            throw new AppException("Thiếu mã món hàng", HttpStatus.BAD_REQUEST);
        }
        if ("ARTICLE".equals(type)) {
            return buyArticle(userId, itemId);
        }
        if ("SUBSCRIPTION".equals(type)) {
            return buyPlan(userId, itemId);
        }
        throw new AppException("Loại món hàng không hợp lệ: " + type + " (ARTICLE, SUBSCRIPTION)", HttpStatus.BAD_REQUEST);
    }

    private OrderCreateResponse buyArticle(Long userId, Long articleId) {
        Map<String, Object> article = jdbc.queryForList("""
                SELECT a.single_price AS price, v.title
                FROM articles a
                JOIN article_versions v ON v.article_id = a.article_id AND v.version_number = a.published_version
                WHERE a.article_id = ? AND a.status = 'PUBLISHED' AND a.access_type = 'PREMIUM' AND a.single_price > 0
                """, articleId).stream().findFirst()
                .orElseThrow(() -> new AppException("Không có bài PREMIUM #" + articleId, HttpStatus.NOT_FOUND));
        BigDecimal price = (BigDecimal) article.get("price");

        // UNIQUE(user_id, article_id): mua lại sau khi bị thu hồi thì đưa dòng cũ về PENDING
        String current = jdbc.queryForList("SELECT access_status FROM article_purchases WHERE user_id = ? AND article_id = ? FOR UPDATE",
                String.class, userId, articleId).stream().findFirst().orElse(null);
        if ("ACTIVE".equals(current)) {
            throw new AppException("Bạn đã mua bài này", HttpStatus.CONFLICT);
        }
        if (current == null) {
            jdbc.update("INSERT INTO article_purchases (user_id, article_id, purchase_price, access_status) VALUES (?, ?, ?, 'PENDING')",
                    userId, articleId, price);
        } else {
            jdbc.update("UPDATE article_purchases SET purchase_price = ?, access_status = 'PENDING', purchased_at = NOW() "
                    + "WHERE user_id = ? AND article_id = ?", price, userId, articleId);
        }
        Long purchaseId = jdbc.queryForObject("SELECT purchase_id FROM article_purchases WHERE user_id = ? AND article_id = ?",
                Long.class, userId, articleId);

        String title = (String) article.get("title");
        return paymentProcessingService.createOrder(userId, CreateOrderRequest.builder()
                .orderType("ARTICLE").targetId(purchaseId).amount(price)
                .description(DEMO_PREFIX + "Mua bài: " + title).targetTitle(title)
                .build());
    }

    private OrderCreateResponse buyPlan(Long userId, Long planId) {
        Map<String, Object> plan = jdbc.queryForList(
                        "SELECT name, price, duration_days FROM subscription_plans WHERE plan_id = ? AND status = 'ACTIVE' AND price > 0",
                        planId).stream().findFirst()
                .orElseThrow(() -> new AppException("Không có gói #" + planId + " đang bán", HttpStatus.NOT_FOUND));
        BigDecimal price = (BigDecimal) plan.get("price");
        int days = ((Number) plan.get("duration_days")).intValue();
        LocalDate today = LocalDate.now();

        jdbc.update("INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status) VALUES (?, ?, ?, ?, 'PENDING')",
                userId, planId, today, today.plusDays(days));
        Long subscriptionId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

        String title = (String) plan.get("name");
        return paymentProcessingService.createOrder(userId, CreateOrderRequest.builder()
                .orderType("SUBSCRIPTION").targetId(subscriptionId).amount(price)
                .description(DEMO_PREFIX + "Mua gói: " + title).targetTitle(title)
                .build());
    }

    /** Tiền đã ghi nhận (sau commit): mở quyền nếu đúng người mua và đủ tiền, giống AdBookingService của SV1. */
    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onPaymentSuccess(PaymentSuccessEvent event) {
        Transaction tx = demoOrder(event.getTransactionId());
        if (tx == null || event.getTargetId() == null) return;
        if ("ARTICLE".equals(event.getTransactionType())) {
            int n = jdbc.update("UPDATE article_purchases SET access_status = 'ACTIVE' "
                            + "WHERE purchase_id = ? AND user_id = ? AND purchase_price <= ? AND access_status = 'PENDING'",
                    event.getTargetId(), event.getUserId(), event.getAmount());
            log.info("[Cửa hàng thử] Mở bài: lượt mua #{} -> {} dòng", event.getTargetId(), n);
        } else if ("SUBSCRIPTION".equals(event.getTransactionType())) {
            int n = jdbc.update("UPDATE subscriptions s JOIN subscription_plans p ON p.plan_id = s.plan_id "
                            + "SET s.status = 'ACTIVE', s.start_date = CURDATE(), s.end_date = CURDATE() + INTERVAL p.duration_days DAY "
                            + "WHERE s.subscription_id = ? AND s.user_id = ? AND p.price <= ? AND s.status = 'PENDING'",
                    event.getTargetId(), event.getUserId(), event.getAmount());
            log.info("[Cửa hàng thử] Kích hoạt gói: subscription #{} -> {} dòng", event.getTargetId(), n);
        }
    }

    /** Hoàn toàn bộ: thu hồi quyền. Hoàn một phần: giữ quyền (UC056). */
    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onRefundCompleted(RefundCompletedEvent event) {
        if (!event.isFullRefund() || event.getTargetId() == null || demoOrder(event.getOriginalTransactionId()) == null) return;
        if ("ARTICLE".equals(event.getTransactionType())) {
            jdbc.update("UPDATE article_purchases SET access_status = 'REVOKED' WHERE purchase_id = ?", event.getTargetId());
        } else if ("SUBSCRIPTION".equals(event.getTransactionType())) {
            jdbc.update("UPDATE subscriptions SET status = 'CANCELLED' WHERE subscription_id = ?", event.getTargetId());
        }
        log.info("[Cửa hàng thử] Thu hồi quyền {} #{} sau hoàn tiền #{}", event.getTransactionType(), event.getTargetId(), event.getRefundId());
    }

    private Transaction demoOrder(Long transactionId) {
        if (transactionId == null) return null;
        return transactionRepository.findById(transactionId)
                .filter(t -> t.getDescription() != null && t.getDescription().startsWith(DEMO_PREFIX))
                .orElse(null);
    }
}
