package com.localpress.finance.service;

import com.localpress.finance.dto.request.CreateOrderRequest;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.shared.event.PaymentSuccessEvent;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * ==============================================================================
 * DỊCH VỤ XỬ LÝ THANH TOÁN TẬP TRUNG (SV4 - PAYMENT PROCESSING SERVICE)
 * ==============================================================================
 * Mọi luồng thanh toán (mua bài lẻ, gói hội viên, booking quảng cáo) đều tạo đơn ở đây
 * rồi chuyển khách sang trang thanh toán chung /payment/:orderCode.
 * - UC047: Tạo đơn thanh toán.
 * - UC048: Xác minh kết quả thanh toán, đối chiếu số tiền.
 * - UC049: Xử lý Webhook IPN SePay idempotent.
 * - UC050: Trạng thái đơn cho trang thanh toán polling.
 * Nguyên tắc: LocalPress KHÔNG giữ tiền khách (không ví, không nạp tiền). Khách quét QR có sẵn đúng
 * mã đơn + đúng số tiền; SePay báo về khớp thì đơn PAID. Khoản không khớp (sai số tiền, về sau khi
 * booking hết giữ chỗ, không có mã đơn) chỉ ghi nhật ký; khách gửi khiếu nại (UC051), kế toán ghi nhận
 * vào đơn hoặc chuyển trả lại tài khoản khách.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentProcessingService {

    private final TransactionRepository transactionRepository;
    private final SePayService sePayService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${localpress.payment.order-ttl-minutes:15}")
    private long orderTtlMinutes = 15;

    // =========================================================================
    // UC047: TẠO ĐƠN
    // =========================================================================

    /**
     * UC047: Tạo đơn thanh toán cho đối tượng nghiệp vụ (bài lẻ, gói, chiến dịch quảng cáo).
     */
    @Transactional
    public OrderCreateResponse createOrder(Long userId, CreateOrderRequest request) {
        log.info("Tạo đơn hàng thanh toán mới: user={}, type={}, targetId={}, amount={}",
                userId, request.getOrderType(), request.getTargetId(), request.getAmount());

        TransactionType type = parseOrderType(request.getOrderType());
        if (!type.isPurchase()) {
            throw new AppException("Không thể tạo đơn loại " + type + " qua API này", HttpStatus.BAD_REQUEST);
        }

        String description = request.getDescription() != null && !request.getDescription().isBlank()
                ? request.getDescription()
                : request.getTargetTitle();

        Transaction.TransactionBuilder txBuilder = newPendingOrder(userId, type, request.getAmount(), description);

        // Gán đúng Scalar Foreign Key theo từng phân hệ (khớp CHECK chk_transactions_targets)
        switch (type) {
            case SUBSCRIPTION -> txBuilder.subscriptionId(request.getTargetId());
            case ARTICLE -> txBuilder.purchaseId(request.getTargetId());
            case AD -> txBuilder.campaignId(request.getTargetId());
            default -> { }
        }

        Transaction savedTx = transactionRepository.save(txBuilder.build());
        log.info("Đã tạo bản ghi Transaction #{} với mã đơn: {}", savedTx.getTransactionId(), savedTx.getGatewayTransactionId());

        return toPaymentView(savedTx);
    }

    // =========================================================================
    // UC050: TRA CỨU ĐƠN CHO TRANG THANH TOÁN
    // =========================================================================

    @Transactional(readOnly = true)
    public OrderCreateResponse getPaymentView(FinanceCurrentUser.Principal principal, String orderCode) {
        return toPaymentView(findViewable(principal, orderCode));
    }

    @Transactional(readOnly = true)
    public OrderStatusResponse getOrderStatus(FinanceCurrentUser.Principal principal, Long transactionId) {
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng #" + transactionId, HttpStatus.NOT_FOUND));
        principal.assertCanAccess(tx.getUserId());
        return toStatus(tx);
    }

    /**
     * "Đơn của tôi": mọi đơn của user đang đăng nhập (kể cả REFUND), mới nhất trước.
     * SV3 dùng cho UC045 thay vì đọc thẳng bảng transactions (Rule 17).
     */
    @Transactional(readOnly = true)
    public Page<OrderStatusResponse> getMyOrders(Long userId, String type, int page, int size) {
        TransactionType transactionType = type == null || type.isBlank() ? null : parseOrderType(type);
        Pageable pageable = PageRequest.of(Math.max(0, page), size <= 0 ? 20 : Math.min(size, 100),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "transactionId")));
        return transactionRepository.findMyOrders(userId, transactionType, pageable).map(this::toStatus);
    }

    @Transactional(readOnly = true)
    public OrderStatusResponse getOrderStatusByCode(FinanceCurrentUser.Principal principal, String orderCode) {
        return toStatus(findViewable(principal, orderCode));
    }

    // =========================================================================
    // UC048 & UC049: WEBHOOK IPN SEPAY
    // =========================================================================

    /**
     * Xử lý IPN đã qua xác thực khóa ở Controller. Các nhánh:
     * 1. Không có mã đơn / đơn không tồn tại  -> ORDER_NOT_FOUND (chỉ ghi nhật ký, khách khiếu nại UC051).
     * 2. Đơn đã SUCCESS                       -> ALREADY_PROCESSED (Rule 5).
     *    Không có số tiền                     -> AMOUNT_MISSING, không đổi gì (Rule 4).
     * 3. Đơn đã đóng / booking quá hạn giữ chỗ -> LATE_PAYMENT, không cấp quyền (Rule 6).
     * 4. Số tiền khác số tiền đơn             -> AMOUNT_MISMATCH, đơn giữ nguyên.
     * 5. Đúng số tiền                         -> SUCCESS + PaymentSuccessEvent.
     * Nhánh 3, 4 không giữ tiền trong hệ thống: kế toán đối chiếu sao kê và chuyển trả lại khách.
     */
    @Transactional
    public Map<String, Object> processSepayIpn(SepayIpnRequest ipnRequest) {
        log.info("Nhận Webhook IPN từ SePay: payload={}", ipnRequest);

        String orderCode = ipnRequest.resolveOrderCode();
        if (orderCode == null || orderCode.isBlank()) {
            log.warn("Webhook IPN không chứa mã đơn hàng hợp lệ.");
            return result(false, "ORDER_NOT_FOUND", null, "Không tìm thấy mã đơn hàng trong payload");
        }

        Transaction tx = transactionRepository.findByGatewayTransactionIdForUpdate(orderCode).orElse(null);
        if (tx == null || !tx.getTransactionType().isPurchase()) {
            log.warn("Không tìm thấy đơn hàng nào khớp với mã: {}. Chờ khiếu nại / đối soát.", orderCode);
            return result(false, "ORDER_NOT_FOUND", orderCode, "Đơn hàng không tồn tại: " + orderCode);
        }

        if (tx.getStatus() == TransactionStatus.SUCCESS) {
            log.info("Giao dịch #{} ({}) đã SUCCESS trước đó. Bỏ qua (Idempotent Hit).", tx.getTransactionId(), orderCode);
            return result(true, "ALREADY_PROCESSED", orderCode, "Giao dịch đã được ghi nhận trước đó");
        }

        // Rule 4: không biết khách chuyển bao nhiêu thì không cấp quyền; log lại để kế toán đối soát (UC054)
        BigDecimal paidAmount = ipnRequest.resolveAmount();
        if (paidAmount == null || paidAmount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Webhook cho đơn {} không có số tiền, không ghi nhận", orderCode);
            return result(false, "AMOUNT_MISSING", orderCode, "Thông báo tiền về không có số tiền, chờ kế toán đối soát");
        }

        // 3. Đơn đã đóng (bị từ chối/hoàn) hoặc booking quảng cáo quá hạn giữ chỗ: không cấp quyền
        if (tx.getStatus() != TransactionStatus.PENDING || tx.isPaymentWindowClosed(LocalDateTime.now())) {
            tx.markExpired();
            transactionRepository.save(tx);
            log.warn("Tiền về sau khi đơn {} hết hiệu lực: {} VND, chờ kế toán chuyển trả", orderCode, paidAmount);
            return result(false, "LATE_PAYMENT", orderCode,
                    "Tiền về sau khi đơn " + orderCode + " hết hiệu lực, kế toán sẽ chuyển trả lại khách");
        }

        // 4. QR đã cố định số tiền: khác số tiền thì không tự ghi nhận
        if (paidAmount.compareTo(tx.getAmount()) != 0) {
            log.warn("Đơn {} chuyển sai số tiền: nhận {} / cần {}", orderCode, paidAmount, tx.getAmount());
            return result(false, "AMOUNT_MISMATCH", orderCode, String.format(
                    "Chuyển %s VND, đơn cần %s VND. Đơn chưa được ghi nhận, kế toán sẽ chuyển trả lại khách",
                    paidAmount.toPlainString(), tx.getAmount().toPlainString()));
        }

        // 5. Đúng số tiền
        tx.markPaidByGateway(sePayService.getBankCode());
        Transaction savedTx = transactionRepository.save(tx);
        publishPaymentSuccess(savedTx);

        Map<String, Object> body = result(true, "SUCCESS", orderCode, "Xác nhận thanh toán thành công");
        body.put("transactionId", savedTx.getTransactionId());
        return body;
    }

    // =========================================================================
    // HÀM NỘI BỘ
    // =========================================================================

    private Transaction.TransactionBuilder newPendingOrder(Long userId, TransactionType type, BigDecimal amount, String description) {
        LocalDateTime now = LocalDateTime.now();
        return Transaction.builder()
                .userId(userId)
                .transactionType(type)
                .amount(amount)
                .currency("VND")
                // Mọi khoản tiền vào đều qua QR SePay; không có ví, không có chuyển khoản thủ công do kế toán duyệt
                .paymentMethod("SEPAY")
                .bankCode(sePayService.getBankCode())
                .gatewayTransactionId(generateOrderCode(now))
                .description(description)
                .status(TransactionStatus.PENDING)
                .createdAt(now)
                .expiresAt(now.plusMinutes(orderTtlMinutes));
    }

    /**
     * Mã đơn ngắn, chỉ chữ + số để ngân hàng không cắt mất khi nhập nội dung chuyển khoản.
     */
    private String generateOrderCode(LocalDateTime now) {
        String timestamp = now.format(DateTimeFormatter.ofPattern("yyMMddHHmm"));
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();
        return "LP" + timestamp + randomSuffix;
    }

    private TransactionType parseOrderType(String orderType) {
        String rawType = orderType != null ? orderType.toUpperCase().trim() : "";
        if ("ARTICLE_PURCHASE".equals(rawType)) rawType = "ARTICLE";
        if ("AD_CAMPAIGN".equals(rawType)) rawType = "AD";
        try {
            return TransactionType.valueOf(rawType);
        } catch (IllegalArgumentException e) {
            throw new AppException("Loại giao dịch không hợp lệ: " + orderType, HttpStatus.BAD_REQUEST);
        }
    }

    private Transaction findByCode(String orderCode) {
        return transactionRepository.findByGatewayTransactionId(orderCode).orElseThrow(() -> orderNotFound(orderCode));
    }

    /** Chủ đơn hoặc nhân sự tài chính mới xem được đơn (Rule 14). */
    private Transaction findViewable(FinanceCurrentUser.Principal principal, String orderCode) {
        Transaction tx = findByCode(orderCode);
        principal.assertCanAccess(tx.getUserId());
        return tx;
    }

    private static AppException orderNotFound(String orderCode) {
        return new AppException("Không tìm thấy đơn hàng với mã: " + orderCode, HttpStatus.NOT_FOUND);
    }

    private void publishPaymentSuccess(Transaction tx) {
        eventPublisher.publishEvent(PaymentSuccessEvent.builder()
                .transactionId(tx.getTransactionId())
                .userId(tx.getUserId())
                .transactionType(tx.getTransactionType().name())
                .targetId(tx.resolveTargetId())
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .paymentMethod(tx.getPaymentMethod())
                .gatewayTransactionId(tx.getGatewayTransactionId())
                .paidAt(tx.getPaidAt())
                .build());
        log.info("Đã phát tán PaymentSuccessEvent cho giao dịch #{}, target: {}#{}",
                tx.getTransactionId(), tx.getTransactionType(), tx.resolveTargetId());
    }

    private OrderCreateResponse toPaymentView(Transaction tx) {
        boolean expired = tx.isPendingExpired();
        return OrderCreateResponse.builder()
                .transactionId(tx.getTransactionId())
                .orderCode(tx.getGatewayTransactionId())
                .orderType(tx.getTransactionType().name())
                .targetId(tx.resolveTargetId())
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .status(tx.getStatus().name())
                .isPaid(tx.getStatus() == TransactionStatus.SUCCESS)
                .expired(expired)
                .paymentMethod(tx.getPaymentMethod())
                .description(tx.getDescription())
                // Chỉ trả QR khi đơn còn chờ thanh toán và chưa hết hạn
                .qrCodeUrl(tx.getStatus() == TransactionStatus.PENDING && !expired ? sePayService.generateVietQrUrl(tx.getGatewayTransactionId(), tx.getAmount()) : null)
                .bankCode(sePayService.getBankCode())
                .accountNumber(sePayService.getAccountNumber())
                .accountName(sePayService.getAccountName())
                .transferContent(tx.getGatewayTransactionId())
                .createdAt(tx.getCreatedAt())
                .expiresAt(tx.getExpiresAt())
                .paidAt(tx.getPaidAt())
                .build();
    }

    private OrderStatusResponse toStatus(Transaction tx) {
        return OrderStatusResponse.builder()
                .transactionId(tx.getTransactionId())
                .orderCode(tx.getGatewayTransactionId())
                .orderType(tx.getTransactionType().name())
                .status(tx.getStatus().name())
                .isPaid(tx.getStatus() == TransactionStatus.SUCCESS)
                .expired(tx.isPendingExpired())
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .paymentMethod(tx.getPaymentMethod())
                .paidAt(tx.getPaidAt())
                .createdAt(tx.getCreatedAt())
                .expiresAt(tx.getExpiresAt())
                .description(tx.getDescription())
                .targetId(tx.resolveTargetId())
                .build();
    }

    /** Body kết quả xử lý tiền vào, dùng chung với SepayGatewayService. */
    static Map<String, Object> result(boolean success, String status, String orderCode, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", success);
        body.put("status", status);
        if (orderCode != null) body.put("orderCode", orderCode);
        body.put("message", message);
        return body;
    }
}
