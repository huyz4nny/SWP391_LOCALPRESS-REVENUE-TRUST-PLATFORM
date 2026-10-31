package com.localpress.reader.service;

import com.localpress.reader.repository.ReaderEntitlementRepository;
import com.localpress.reader.repository.ReaderEntitlementRepository.PurchaseForGrant;
import com.localpress.reader.repository.ReaderEntitlementRepository.SubscriptionForGrant;
import com.localpress.shared.event.PaymentSuccessEvent;
import com.localpress.shared.event.RefundCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

// listener của SV3 cấp quyền đọc khi tiền về và thu hồi quyền khi hoàn toàn bộ tiền (UC034 UC035 UC056)
// luồng đi là SV4 xử lý webhook xong -> publish PaymentSuccessEvent hoặc RefundCompletedEvent -> hàm ở đây nhận -> kiểm tra điều kiện -> cập nhật article_purchases hoặc subscriptions
// quy ước đã thống nhất với Leader Huy vì listener chạy đồng bộ trong cùng transaction với webhook của SV4
//  1 tuyệt đối không ném exception ra ngoài vì sẽ làm rollback đơn và log webhook của SV4 rồi SePay gửi lại
//  2 kiểm tra hết điều kiện bằng các câu SELECT trước rồi mới ghi và không gọi hàm @Transactional có thể ném lỗi bên trong
//  3 phải idempotent vì kế toán ghi nhận khiếu nại sẽ chạy lại đúng logic webhook nên cùng một giao dịch có thể đến lần nữa
// vì vậy class này và repository của nó cố ý không gắn @Transactional
@Slf4j
@Component
@RequiredArgsConstructor
public class ReaderEntitlementListener {

    // múi giờ Việt Nam để tính đúng ngày bắt đầu và kết thúc của gói
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ReaderEntitlementRepository repository;

    // block nhận sự kiện tiền về thành công
    // chỉ xử lý loại ARTICLE và SUBSCRIPTION còn AD của SV1 và REFUND thì bỏ qua
    // mọi lỗi bất ngờ đều bị bắt lại và báo qua reportGrantFailure chứ không ném ra ngoài
    @EventListener
    public void onPaymentSuccess(PaymentSuccessEvent event) {
        if (event == null || event.getTransactionType() == null) {
            return;
        }
        try {
            switch (event.getTransactionType()) {
                case "ARTICLE" -> grantArticle(event);
                case "SUBSCRIPTION" -> grantSubscription(event);
                default -> {
                    // loại khác không thuộc SV3
                }
            }
        } catch (Exception unexpected) {
            reportGrantFailure(event, "Lỗi hệ thống khi cấp quyền: " + unexpected.getMessage());
        }
    }

    // block nhận sự kiện hoàn tiền đã được duyệt
    // quy định đã chốt là chỉ hoàn toàn bộ mới thu hồi quyền còn hoàn một phần thì khách giữ quyền
    // targetId là id của đúng kỳ bị hoàn nên kỳ gia hạn có giao dịch riêng vẫn còn hiệu lực
    @EventListener
    public void onRefundCompleted(RefundCompletedEvent event) {
        if (event == null || !event.shouldRevokeRights() || event.getTransactionType() == null) {
            return;
        }
        try {
            switch (event.getTransactionType()) {
                case "ARTICLE" -> {
                    int revoked = repository.revokePurchase(event.getTargetId(), event.getUserId());
                    log.info("Hoàn toàn bộ bài lẻ purchase #{}: thu hồi {} bản ghi", event.getTargetId(), revoked);
                }
                case "SUBSCRIPTION" -> {
                    int cancelled = repository.cancelSubscription(event.getTargetId(), event.getUserId());
                    log.info("Hoàn toàn bộ gói subscription #{}: hủy {} bản ghi", event.getTargetId(), cancelled);
                }
                default -> {
                    // loại khác không thuộc SV3
                }
            }
        } catch (Exception unexpected) {
            // không có sự kiện báo lỗi cho chiều hoàn tiền nên chỉ ghi log để đối soát tay
            log.error("Không thu hồi được quyền cho hoàn tiền #{} loại {} target #{}: {}",
                    event.getRefundId(), event.getTransactionType(), event.getTargetId(), unexpected.getMessage());
        }
    }

    // block cấp quyền đọc bài lẻ: kiểm tra đủ điều kiện rồi mới chuyển PENDING sang ACTIVE
    private void grantArticle(PaymentSuccessEvent event) {
        if (event.getTargetId() == null) {
            reportGrantFailure(event, "Đơn bài lẻ thiếu purchase_id");
            return;
        }
        PurchaseForGrant purchase = repository.findPurchaseForGrant(event.getTargetId()).orElse(null);
        if (purchase == null) {
            reportGrantFailure(event, "Không tìm thấy bản ghi mua lẻ #" + event.getTargetId());
            return;
        }
        // bản ghi phải thuộc đúng người đã trả tiền để không ai cấp quyền cho bản ghi của người khác
        if (!purchase.userId().equals(event.getUserId())) {
            reportGrantFailure(event, "Bản ghi mua lẻ #" + purchase.purchaseId() + " không thuộc người thanh toán");
            return;
        }
        // đã ACTIVE thì sự kiện này đã được xử lý trước đó nên bỏ qua để chạy lại vẫn an toàn
        if ("ACTIVE".equals(purchase.accessStatus())) {
            log.info("Bản ghi mua lẻ #{} đã ACTIVE, bỏ qua sự kiện lặp của giao dịch #{}",
                    purchase.purchaseId(), event.getTransactionId());
            return;
        }
        if (!"PENDING".equals(purchase.accessStatus())) {
            reportGrantFailure(event, "Bản ghi mua lẻ #" + purchase.purchaseId()
                    + " đang ở trạng thái " + purchase.accessStatus() + " không phải PENDING");
            return;
        }
        // số tiền khách trả phải đủ giá đã chốt trên server (article_purchases.price)
        if (event.getAmount() == null || event.getAmount().compareTo(purchase.price()) < 0) {
            reportGrantFailure(event, "Số tiền " + event.getAmount() + " thấp hơn giá bài " + purchase.price());
            return;
        }
        int updated = repository.activatePurchase(purchase.purchaseId(), paidAtOrNow(event));
        log.info("Đã cấp quyền đọc bài lẻ purchase #{} cho user #{} (cập nhật {} dòng)",
                purchase.purchaseId(), purchase.userId(), updated);
    }

    // block kích hoạt gói cước: kiểm tra đủ điều kiện rồi tính ngày thật và chuyển PENDING sang ACTIVE
    private void grantSubscription(PaymentSuccessEvent event) {
        if (event.getTargetId() == null) {
            reportGrantFailure(event, "Đơn gói thiếu subscription_id");
            return;
        }
        SubscriptionForGrant subscription = repository.findSubscriptionForGrant(event.getTargetId()).orElse(null);
        if (subscription == null) {
            reportGrantFailure(event, "Không tìm thấy bản ghi gói #" + event.getTargetId());
            return;
        }
        if (!subscription.userId().equals(event.getUserId())) {
            reportGrantFailure(event, "Bản ghi gói #" + subscription.subscriptionId() + " không thuộc người thanh toán");
            return;
        }
        if ("ACTIVE".equals(subscription.status())) {
            log.info("Bản ghi gói #{} đã ACTIVE, bỏ qua sự kiện lặp của giao dịch #{}",
                    subscription.subscriptionId(), event.getTransactionId());
            return;
        }
        if (!"PENDING".equals(subscription.status())) {
            reportGrantFailure(event, "Bản ghi gói #" + subscription.subscriptionId()
                    + " đang ở trạng thái " + subscription.status() + " không phải PENDING");
            return;
        }
        if (event.getAmount() == null || event.getAmount().compareTo(subscription.planPrice()) < 0) {
            reportGrantFailure(event, "Số tiền " + event.getAmount() + " thấp hơn giá gói " + subscription.planPrice());
            return;
        }

        // ngày bắt đầu là ngày trả tiền nhưng nếu khách còn gói đang chạy thì nối tiếp từ ngày sau ngày hết hạn của gói đó
        // ngày kết thúc là ngày bắt đầu cộng số ngày của gói
        LocalDate paidDate = paidAtOrNow(event).toLocalDate();
        LocalDate start = repository.findLatestActiveEndDate(subscription.userId(), paidDate)
                .map(latestEnd -> latestEnd.plusDays(1))
                .filter(continuation -> continuation.isAfter(paidDate))
                .orElse(paidDate);
        LocalDate end = start.plusDays(subscription.durationDays());

        int updated = repository.activateSubscription(subscription.subscriptionId(), start, end);
        log.info("Đã kích hoạt gói subscription #{} cho user #{} từ {} đến {} (cập nhật {} dòng)",
                subscription.subscriptionId(), subscription.userId(), start, end, updated);
    }

    // block lấy thời điểm trả tiền theo giờ Việt Nam và nếu sự kiện không có thì dùng giờ hiện tại
    private LocalDateTime paidAtOrNow(PaymentSuccessEvent event) {
        return event.getPaidAt() != null ? event.getPaidAt() : LocalDateTime.now(VN_ZONE);
    }

    // block duy nhất báo lỗi khi tiền đã về mà không cấp được quyền (Rule 5)
    // Leader Huy sẽ thêm RightsGrantFailedEvent(transactionId, reason) vào shared.event để đưa đơn vào hàng chờ đối soát
    // khi có class đó thì chỉ cần publish sự kiện ngay tại đây và bản ghi vẫn giữ PENDING
    // hiện tại chỉ ghi log mức ERROR kèm mã giao dịch để kế toán tra được
    private void reportGrantFailure(PaymentSuccessEvent event, String reason) {
        log.error("CẤP QUYỀN THẤT BẠI sau khi tiền đã về: giao dịch #{} loại {} target #{} user #{} số tiền {}: {}",
                event.getTransactionId(), event.getTransactionType(), event.getTargetId(),
                event.getUserId(), event.getAmount(), reason);
    }
}
