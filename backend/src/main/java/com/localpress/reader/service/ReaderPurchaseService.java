package com.localpress.reader.service;

import com.localpress.reader.dto.PendingOrderTargetResponse;
import com.localpress.reader.repository.ReaderPurchaseRepository;
import com.localpress.reader.repository.ReaderPurchaseRepository.ActiveSubscription;
import com.localpress.reader.repository.ReaderPurchaseRepository.ArticleForSale;
import com.localpress.reader.repository.ReaderPurchaseRepository.PlanRow;
import com.localpress.reader.repository.ReaderPurchaseRepository.PurchaseRow;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;

// service của SV3 tạo bản ghi chờ thanh toán cho UC034 mua lẻ bài và UC035 đăng ký gói
// hợp đồng với SV4 là SV3 phải tạo article_purchases hoặc subscriptions ở trạng thái PENDING trước rồi frontend mới gọi POST /finance/orders với targetId là id đó
// luồng đi là ReaderPurchaseController gọi vào đây -> kiểm tra điều kiện -> ReaderPurchaseRepository ghi bản ghi PENDING -> trả targetId và số tiền
// việc chuyển PENDING sang ACTIVE không làm ở đây mà do listener nghe PaymentSuccessEvent của SV4 làm sau khi tiền về
@Service
@RequiredArgsConstructor
public class ReaderPurchaseService {

    // múi giờ Việt Nam để tính đúng ngày hôm nay cho start_date và end_date
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ReaderPurchaseRepository repository;

    // block tạo hoặc dùng lại bản ghi mua lẻ PENDING cho UC034
    // luồng đi là kiểm tra bài có bán lẻ được không -> kiểm tra đã mua hoặc đã có gói bao trùm chưa -> tạo mới hoặc dùng lại bản ghi -> trả purchase_id và giá
    @Transactional
    public PendingOrderTargetResponse createArticlePurchase(Long userId, Long articleId) {
        ArticleForSale article = repository.findArticleForSale(articleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết"));

        // chỉ bài premium đã xuất bản mới bán lẻ được
        if (!"PUBLISHED".equals(article.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài viết chưa được xuất bản");
        }
        if (!"PREMIUM".equals(article.accessType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài viết miễn phí, không cần mua");
        }
        // bài premium mà chưa có giá hợp lệ thì không thể tạo đơn
        BigDecimal price = article.singlePrice();
        if (price == null || price.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài viết chưa có giá bán lẻ");
        }

        // đã có gói còn hạn bao trùm bài này thì chặn để khách không mua thừa
        LocalDate today = LocalDate.now(VN_ZONE);
        boolean coveredBySubscription = repository.findActiveSubscriptions(userId, today).stream()
                .anyMatch(subscription -> subscriptionCoversArticle(subscription, article.categoryId()));
        if (coveredBySubscription) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã có quyền đọc bài này qua gói đang sử dụng");
        }

        Long purchaseId = preparePendingPurchase(userId, articleId, price);

        return PendingOrderTargetResponse.builder()
                .orderType("ARTICLE")
                .targetId(purchaseId)
                .amount(price)
                .title(article.title())
                .build();
    }

    // block tạo hoặc dùng lại bản ghi gói PENDING cho UC035
    // khách đang có gói vẫn được mua tiếp để gia hạn nên ở đây không chặn
    // ngày bắt đầu và kết thúc thật được tính lúc thanh toán xong ở listener
    @Transactional
    public PendingOrderTargetResponse createSubscription(Long userId, Long planId) {
        PlanRow plan = repository.findPlan(planId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước"));

        // gói đã ngừng bán thì không cho đăng ký mới
        if (!"ACTIVE".equals(plan.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Gói cước này đã ngừng bán");
        }
        if (plan.price() == null || plan.price().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Gói cước chưa có giá hợp lệ");
        }

        LocalDate today = LocalDate.now(VN_ZONE);
        // đã có một bản ghi chờ cho đúng gói này thì dùng lại để không sinh ra nhiều bản ghi PENDING rác
        Long subscriptionId = repository.findPendingSubscriptionId(userId, planId)
                .map(existingId -> {
                    repository.refreshPendingSubscription(existingId, today);
                    return existingId;
                })
                .orElseGet(() -> repository.insertPendingSubscription(userId, planId, today));

        return PendingOrderTargetResponse.builder()
                .orderType("SUBSCRIPTION")
                .targetId(subscriptionId)
                .amount(plan.price())
                .title(plan.name())
                .build();
    }

    // block quyết định dùng lại hay tạo mới bản ghi mua lẻ
    // PENDING hoặc REVOKED thì đưa về PENDING với giá mới và ACTIVE thì từ chối vì đã mua rồi
    private Long preparePendingPurchase(Long userId, Long articleId, BigDecimal price) {
        PurchaseRow existing = repository.findPurchase(userId, articleId).orElse(null);
        if (existing == null) {
            try {
                return repository.insertPendingPurchase(userId, articleId, price);
            } catch (DuplicateKeyException race) {
                // hai request đến cùng lúc và request kia đã tạo xong nên đọc lại bản ghi vừa có
                existing = repository.findPurchase(userId, articleId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Không thể tạo đơn, vui lòng thử lại"));
            }
        }
        if ("ACTIVE".equals(existing.accessStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã mua bài viết này");
        }
        repository.resetPurchaseToPending(existing.purchaseId(), price);
        return existing.purchaseId();
    }

    // cùng quy tắc với PaywallEngine: gói ALL bao mọi bài, gói CATEGORY chỉ đúng chuyên mục của bài
    private boolean subscriptionCoversArticle(ActiveSubscription subscription, Long articleCategoryId) {
        if ("ALL".equals(subscription.accessScope()) && subscription.categoryId() == null) {
            return true;
        }
        return "CATEGORY".equals(subscription.accessScope())
                && subscription.categoryId() != null
                && subscription.categoryId().equals(articleCategoryId);
    }
}
