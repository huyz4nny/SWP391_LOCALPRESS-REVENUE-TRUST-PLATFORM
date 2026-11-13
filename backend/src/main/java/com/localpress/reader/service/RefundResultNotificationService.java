package com.localpress.reader.service;

import com.localpress.reader.repository.ReaderNotificationRepository;
import com.localpress.reader.repository.ReaderNotificationRepository.RefundContext;
import com.localpress.shared.event.RefundCompletedEvent;
import com.localpress.shared.event.RefundRejectedEvent;
import com.localpress.shared.mail.MailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.Set;

// UC046 + UC056: báo kết quả hoàn tiền cho độc giả sau khi kế toán trưởng duyệt hoặc từ chối (SV4 phát sự kiện)
//   1. luôn ghi thông báo trong app (kênh chính, có đủ số tiền, mã đơn, lý do)
//   2. thử gửi email ngắn "đã có kết quả, đăng nhập để xem" (kênh phụ, không ghi số tiền hay mã đơn
//      vì email chưa được xác minh), rồi ghi lại SENT hoặc FAILED
// đơn quảng cáo (AD) do SV1 tự thông báo nên bỏ qua
@Slf4j
@Service
public class RefundResultNotificationService {

    static final Set<String> READER_ORDER_TYPES = Set.of("ARTICLE", "SUBSCRIPTION");
    // bấm thông báo mở lịch sử giao dịch để xem đơn đã hoàn
    static final String LINK = "/account/orders";
    static final String EMAIL_SUBJECT = "LocalPress: yêu cầu của bạn đã có kết quả";
    static final String EMAIL_BODY = """
            Xin chào,

            Yêu cầu hoàn tiền / hỗ trợ thanh toán của bạn tại LocalPress đã có kết quả.
            Vui lòng đăng nhập LocalPress và mở mục "Thông báo" trong trang tài khoản để xem chi tiết.

            Đây là email tự động, vui lòng không trả lời.
            LocalPress""";

    private final ReaderNotificationRepository repository;
    private final MailService mailService;
    private final TransactionTemplate newTransaction;

    public RefundResultNotificationService(ReaderNotificationRepository repository,
                                           MailService mailService,
                                           PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.mailService = mailService;
        // listener chạy sau khi transaction hoàn tiền đã commit nên mỗi lần ghi phải mở transaction mới
        this.newTransaction = new TransactionTemplate(transactionManager);
        this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void recordCompleted(RefundCompletedEvent event) {
        if (event == null || !isReaderOrder(event.getTransactionType(), event.getUserId(), event.getRefundId())) {
            return;
        }
        String order = orderPhrase(event.getOriginalTransactionId());
        StringBuilder content = new StringBuilder("Kế toán đã duyệt hoàn ")
                .append(money(event.getRefundAmount())).append(" cho ").append(order).append('.');
        content.append(" Tiền được chuyển khoản về tài khoản ngân hàng của bạn.");
        if (event.isFullRefund()) {
            content.append(" Quyền đọc của đơn này đã kết thúc.");
        }
        if (hasText(event.getReason())) {
            content.append(" Lý do: ").append(event.getReason().trim());
        }
        notifyReader(event.getUserId(), ReaderNotificationRepository.TYPE_REFUND_COMPLETED,
                "Đã hoàn tiền " + money(event.getRefundAmount()), content.toString(),
                "REFUND_COMPLETED:" + event.getRefundId());
    }

    public void recordRejected(RefundRejectedEvent event) {
        if (event == null || !isReaderOrder(event.getTransactionType(), event.getUserId(), event.getRefundId())) {
            return;
        }
        String order = orderPhrase(event.getOriginalTransactionId());
        StringBuilder content = new StringBuilder("Yêu cầu hoàn ")
                .append(money(event.getRefundAmount())).append(" cho ").append(order).append(" không được duyệt.");
        if (hasText(event.getReviewNotes())) {
            content.append(" Ghi chú của kế toán: ").append(event.getReviewNotes().trim());
        }
        content.append(" Nếu cần, bạn có thể gửi khiếu nại mới ở trang Hỗ trợ.");
        notifyReader(event.getUserId(), ReaderNotificationRepository.TYPE_REFUND_REJECTED,
                "Yêu cầu hoàn tiền không được duyệt", content.toString(),
                "REFUND_REJECTED:" + event.getRefundId());
    }

    private void notifyReader(long userId, String type, String title, String content, String dedupKey) {
        Integer inserted = newTransaction.execute(status ->
                repository.insertInApp(userId, type, title, content, LINK, dedupKey));
        if (inserted == null || inserted == 0) {
            // sự kiện này đã được xử lý trước đó: không gửi lại email
            log.info("Bỏ qua thông báo {} vì đã ghi trước đó", dedupKey);
            return;
        }
        // gửi email ngoài transaction để không giữ kết nối DB trong lúc chờ máy chủ SMTP
        String email = repository.findActiveUserEmail(userId).orElse(null);
        boolean sent = email != null && mailService.send(email, EMAIL_SUBJECT, EMAIL_BODY);
        newTransaction.executeWithoutResult(status ->
                repository.insertEmailLog(userId, type, EMAIL_SUBJECT, EMAIL_BODY, sent, dedupKey + ":EMAIL"));
    }

    private static boolean isReaderOrder(String type, Long userId, Long refundId) {
        return type != null && READER_ORDER_TYPES.contains(type) && userId != null && refundId != null;
    }

    // "đơn LP123 (Tên bài)" hoặc "đơn #45" khi không tra được mã đơn
    private String orderPhrase(Long originalTransactionId) {
        if (originalTransactionId == null) {
            return "đơn của bạn";
        }
        RefundContext context;
        try {
            context = repository.findRefundContext(originalTransactionId).orElse(null);
        } catch (RuntimeException exception) {
            // tra mã đơn / tên bài lỗi thì vẫn phải báo cho độc giả, chỉ ghi "#id"
            log.warn("Không tra được thông tin đơn #{} cho thông báo hoàn tiền: {}",
                    originalTransactionId, exception.getMessage());
            context = null;
        }
        String code = context != null && hasText(context.orderCode()) ? context.orderCode() : "#" + originalTransactionId;
        String item = context != null && hasText(context.itemName()) ? " (" + context.itemName().trim() + ")" : "";
        return "đơn " + code + item;
    }

    static String money(BigDecimal amount) {
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN"));
        return format.format(amount == null ? BigDecimal.ZERO : amount) + " ₫";
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
