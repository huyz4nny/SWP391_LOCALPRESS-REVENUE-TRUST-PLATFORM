package com.localpress.reader.service;

import com.localpress.finance.dto.request.CreateOrderRequest;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.reader.dto.PendingOrderTargetResponse;
import com.localpress.reader.repository.ReaderPurchaseRepository;
import com.localpress.reader.repository.ReaderPurchaseRepository.ActiveSubscription;
import com.localpress.reader.repository.ReaderPurchaseRepository.ArticleForSale;
import com.localpress.reader.repository.ReaderPurchaseRepository.PendingSubscriptionRow;
import com.localpress.reader.repository.ReaderPurchaseRepository.PlanRow;
import com.localpress.reader.repository.ReaderPurchaseRepository.PurchaseRow;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.function.Consumer;

// UC034/UC035: tạo quyền PENDING rồi gọi PaymentProcessingService giống AdBookingService.
// Mã đơn lưu ở article_purchases / subscriptions.payment_order_code, không đọc bảng transactions.
@Service
@RequiredArgsConstructor
public class ReaderPurchaseService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ReaderPurchaseRepository repository;
    private final PaymentProcessingService payments;
    private final FinanceCurrentUser financeUser;

    @Transactional
    public PendingOrderTargetResponse createArticlePurchase(Long userId, Long articleId) {
        ArticleForSale article = repository.findArticleForSale(articleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết"));

        if (!"PUBLISHED".equals(article.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài viết chưa được xuất bản");
        }
        if (!"PREMIUM".equals(article.accessType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài viết miễn phí, không cần mua");
        }
        BigDecimal price = article.singlePrice();
        if (price == null || price.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài viết chưa có giá bán lẻ");
        }

        LocalDate today = LocalDate.now(VN_ZONE);
        boolean coveredBySubscription = repository.findActiveSubscriptions(userId, today).stream()
                .anyMatch(subscription -> subscriptionCoversArticle(subscription, article.categoryId()));
        if (coveredBySubscription) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã có quyền đọc bài này qua gói đang sử dụng");
        }

        PurchaseRow purchase = preparePendingPurchase(userId, articleId, price);
        return attachFinanceOrder(
                userId, "ARTICLE", purchase.purchaseId(), price, article.title(),
                purchase.paymentOrderCode(),
                code -> repository.updatePurchaseOrderCode(purchase.purchaseId(), code));
    }

    @Transactional
    public PendingOrderTargetResponse createSubscription(Long userId, Long planId) {
        PlanRow plan = repository.findPlan(planId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước"));

        if (!"ACTIVE".equals(plan.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Gói cước này đã ngừng bán");
        }
        if (plan.price() == null || plan.price().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Gói cước chưa có giá hợp lệ");
        }

        LocalDate today = LocalDate.now(VN_ZONE);
        PendingSubscriptionRow pending = repository.findPendingSubscription(userId, planId)
                .map(existing -> {
                    repository.refreshPendingSubscription(existing.subscriptionId(), today);
                    return existing;
                })
                .orElseGet(() -> new PendingSubscriptionRow(
                        repository.insertPendingSubscription(userId, planId, today), null));

        return attachFinanceOrder(
                userId, "SUBSCRIPTION", pending.subscriptionId(), plan.price(), plan.name(),
                pending.paymentOrderCode(),
                code -> repository.updateSubscriptionOrderCode(pending.subscriptionId(), code));
    }

    // Dùng lại đơn nếu còn PENDING, chưa hết hạn và amount khớp giá hiện tại. Còn lại tạo đơn mới và ghi đè mã.
    private PendingOrderTargetResponse attachFinanceOrder(
            Long userId,
            String orderType,
            Long targetId,
            BigDecimal amount,
            String title,
            String storedOrderCode,
            Consumer<String> saveOrderCode) {
        OrderCreateResponse order = reuseOpenOrder(storedOrderCode, amount);
        if (order == null) {
            order = payments.createOrder(userId, CreateOrderRequest.builder()
                    .orderType(orderType)
                    .targetId(targetId)
                    .amount(amount)
                    .targetTitle(title)
                    .description(title)
                    .build());
            saveOrderCode.accept(order.getOrderCode());
        }
        return PendingOrderTargetResponse.builder()
                .orderType(orderType)
                .targetId(targetId)
                .amount(amount)
                .title(title)
                .orderCode(order.getOrderCode())
                .build();
    }

    private OrderCreateResponse reuseOpenOrder(String storedOrderCode, BigDecimal amount) {
        if (storedOrderCode == null || storedOrderCode.isBlank()) {
            return null;
        }
        try {
            OrderCreateResponse current = payments.getPaymentView(financeUser.require(), storedOrderCode);
            if (current.isPaid()) {
                return current;
            }
            if ("PENDING".equals(current.getStatus())
                    && !current.isExpired()
                    && current.getAmount() != null
                    && current.getAmount().compareTo(amount) == 0) {
                return current;
            }
            return null;
        } catch (AppException missing) {
            if (missing.getStatus() == HttpStatus.NOT_FOUND) {
                return null;
            }
            throw missing;
        }
    }

    private PurchaseRow preparePendingPurchase(Long userId, Long articleId, BigDecimal price) {
        PurchaseRow existing = repository.findPurchase(userId, articleId).orElse(null);
        if (existing == null) {
            try {
                Long purchaseId = repository.insertPendingPurchase(userId, articleId, price);
                return new PurchaseRow(purchaseId, "PENDING", null);
            } catch (DuplicateKeyException race) {
                existing = repository.findPurchase(userId, articleId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Không thể tạo đơn, vui lòng thử lại"));
            }
        }
        if ("ACTIVE".equals(existing.accessStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã mua bài viết này");
        }
        repository.resetPurchaseToPending(existing.purchaseId(), price);
        return existing;
    }

    private boolean subscriptionCoversArticle(ActiveSubscription subscription, Long articleCategoryId) {
        if ("ALL".equals(subscription.accessScope()) && subscription.categoryId() == null) {
            return true;
        }
        return "CATEGORY".equals(subscription.accessScope())
                && subscription.categoryId() != null
                && subscription.categoryId().equals(articleCategoryId);
    }
}
