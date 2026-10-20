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
 * Mọi luồng thanh toán (mua bài lẻ, gói hội viên, booking quảng cáo, nạp ví) đều tạo đơn ở đây
 * rồi chuyển khách sang trang thanh toán chung /payment/:orderCode.
 * - UC047: Tạo đơn thanh toán (kể cả đơn nạp ví TOPUP).
 * - UC048: Xác minh kết quả thanh toán, đối chiếu số tiền.
 * - UC049: Xử lý Webhook IPN SePay idempotent, xử lý tiền về muộn / chuyển thiếu / chuyển thừa.
 * - UC050: Trạng thái đơn cho trang thanh toán polling.
 * Nguyên tắc: tiền khách đã chuyển không bao giờ bị treo. Không cấp quyền được thì cộng vào ví.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentProcessingService {

    private final TransactionRepository transactionRepository;
    private final SePayService sePayService;
    private final WalletService walletService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${localpress.payment.order-ttl-minutes:15}")
    private long orderTtlMinutes = 15;

    @Value("${localpress.payment.topup-min-amount:10000}")
    private BigDecimal topUpMinAmount = new BigDecimal("10000");

    @Value("${localpress.payment.topup-max-amount:50000000}")
    private BigDecimal topUpMaxAmount = new BigDecimal("50000000");

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
        if (type == TransactionType.REFUND || type == TransactionType.TOPUP) {
            throw new AppException("Không thể tạo đơn loại " + type + " qua API này", HttpStatus.BAD_REQUEST);
        }

        String description = request.getDescription() != null && !request.getDescription().isBlank()
                ? request.getDescription()
                : request.getTargetTitle();

        Transaction.TransactionBuilder txBuilder = newPendingOrder(userId, type, request.getAmount(), description)
                // Mọi khoản tiền vào đều qua SePay (QR) hoặc ví; không còn chuyển khoản thủ công do kế toán duyệt
                .paymentMethod("SEPAY");

        // Gán đúng Scalar Foreign Key theo từng phân hệ (khớp CHECK chk_transactions_targets)
        switch (type) {
            case SUBSCRIPTION -> txBuilder.subscriptionId(request.getTargetId());
            case ARTICLE -> txBuilder.purchaseId(request.getTargetId());
            case AD -> txBuilder.campaignId(request.getTargetId());
            default -> { }
        }

        Transaction savedTx = transactionRepository.save(txBuilder.build());
        log.info("Đã tạo bản ghi Transaction #{} với mã đơn: {}", savedTx.getTransactionId(), savedTx.getGatewayTransactionId());

        OrderCreateResponse response = toPaymentView(savedTx);
        response.setCheckoutFields(sePayService.buildOneTimePaymentFields(
                savedTx.getGatewayTransactionId(),
                savedTx.getAmount(),
                description != null ? description : "Thanh toan don " + savedTx.getGatewayTransactionId(),
                request.getSuccessUrl(),
                request.getErrorUrl(),
                request.getCancelUrl()
        ));
        return response;
    }

    /**
     * Nạp tiền vào Ví LocalPress: tạo đơn TOPUP (không gắn đối tượng), khách quét QR SePay để trả.
     */
    @Transactional
    public OrderCreateResponse createTopUp(Long userId, BigDecimal amount) {
        if (amount == null || amount.compareTo(topUpMinAmount) < 0 || amount.compareTo(topUpMaxAmount) > 0) {
            throw new AppException(String.format("Số tiền nạp phải từ %,d đến %,d VND",
                    topUpMinAmount.longValue(), topUpMaxAmount.longValue()), HttpStatus.BAD_REQUEST);
        }
        if (amount.stripTrailingZeros().scale() > 0) {
            throw new AppException("Số tiền nạp phải là số nguyên VND", HttpStatus.BAD_REQUEST);
        }

        Transaction savedTx = transactionRepository.save(
                newPendingOrder(userId, TransactionType.TOPUP, amount, "Nạp tiền vào Ví LocalPress")
                        .paymentMethod("SEPAY")
                        .build());
        log.info("User #{} tạo đơn nạp ví {} VND, mã {}", userId, amount, savedTx.getGatewayTransactionId());
        return toPaymentView(savedTx);
    }

    // =========================================================================
    // UC050: TRA CỨU ĐƠN CHO TRANG THANH TOÁN
    // =========================================================================

    @Transactional(readOnly = true)
    public OrderCreateResponse getPaymentView(FinanceCurrentUser.Principal principal, String orderCode) {
        Transaction tx = findByCode(orderCode);
        principal.assertCanAccess(tx.getUserId());
        return toPaymentView(tx);
    }

    @Transactional(readOnly = true)
    public OrderStatusResponse getOrderStatus(FinanceCurrentUser.Principal principal, Long transactionId) {
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng #" + transactionId, HttpStatus.NOT_FOUND));
        principal.assertCanAccess(tx.getUserId());
        return toStatus(tx);
    }

    @Transactional(readOnly = true)
    public OrderStatusResponse getOrderStatusByCode(FinanceCurrentUser.Principal principal, String orderCode) {
        Transaction tx = findByCode(orderCode);
        principal.assertCanAccess(tx.getUserId());
        return toStatus(tx);
    }

    // =========================================================================
    // THANH TOÁN BẰNG VÍ
    // =========================================================================

    /**
     * Khách trả đơn bằng số dư ví. Khóa dòng đơn + khóa dòng ví trong cùng 1 transaction DB:
     * bấm 2 lần chỉ trừ 1 lần, số dư không đủ thì không trừ gì và đơn giữ nguyên PENDING.
     */
    @Transactional
    public OrderStatusResponse payWithWallet(FinanceCurrentUser.Principal principal, String orderCode) {
        Transaction tx = transactionRepository.findByGatewayTransactionIdForUpdate(orderCode)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng với mã: " + orderCode, HttpStatus.NOT_FOUND));

        if (!tx.getUserId().equals(principal.userId())) {
            throw new AppException("Bạn không có quyền thanh toán đơn hàng này", HttpStatus.FORBIDDEN);
        }
        if (tx.getTransactionType() == TransactionType.TOPUP || tx.getTransactionType() == TransactionType.REFUND) {
            throw new AppException("Đơn nạp ví không thể thanh toán bằng chính số dư ví", HttpStatus.BAD_REQUEST);
        }
        if (tx.getStatus() == TransactionStatus.SUCCESS) {
            return toStatus(tx);
        }
        if (tx.isExpired(LocalDateTime.now())) {
            throw new AppException("Đơn hàng đã hết hạn, vui lòng tạo lại đơn mới", HttpStatus.GONE);
        }

        walletService.debit(tx, tx.getAmount(), "Thanh toán đơn " + orderCode);
        tx.markPaidByWallet();
        Transaction saved = transactionRepository.save(tx);
        publishPaymentSuccess(saved);
        return toStatus(saved);
    }

    // =========================================================================
    // UC048 & UC049: WEBHOOK IPN SEPAY
    // =========================================================================

    /**
     * Xử lý IPN đã qua xác thực khóa ở Controller. Các nhánh:
     * 1. Không có mã đơn / đơn không tồn tại  -> ORDER_NOT_FOUND (Kế toán đối soát bằng sao kê, UC054).
     * 2. Đơn đã SUCCESS                       -> ALREADY_PROCESSED (Rule 5).
     * 3. Đơn TOPUP                            -> cộng ví đúng số tiền thực nhận.
     * 4. Đơn hết hiệu lực / quảng cáo quá hạn -> tiền vào ví, không cấp quyền (Rule 6).
     * 5. Chuyển thiếu                         -> tiền vào ví, đơn vẫn PENDING để khách bù.
     * 6. Đủ hoặc thừa                         -> SUCCESS + PaymentSuccessEvent, phần thừa vào ví.
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
        if (tx == null) {
            log.warn("Không tìm thấy giao dịch nào khớp với mã đơn hàng: {}. Chờ Kế toán đối soát.", orderCode);
            return result(false, "ORDER_NOT_FOUND", orderCode, "Đơn hàng không tồn tại: " + orderCode);
        }

        if (tx.getStatus() == TransactionStatus.SUCCESS) {
            log.info("Giao dịch #{} ({}) đã SUCCESS trước đó. Bỏ qua (Idempotent Hit).", tx.getTransactionId(), orderCode);
            return result(true, "ALREADY_PROCESSED", orderCode, "Giao dịch đã được ghi nhận trước đó");
        }

        BigDecimal paidAmount = ipnRequest.resolveAmount();
        if (paidAmount == null || paidAmount.compareTo(BigDecimal.ZERO) <= 0) {
            paidAmount = tx.getAmount();
        }
        String reference = ipnRequest.getReferenceCode();

        // 3. Nạp ví: cộng đúng số tiền thực nhận, kể cả khi về sau hạn QR (không có gì để mất chỗ)
        if (tx.getTransactionType() == TransactionType.TOPUP) {
            tx.setAmount(paidAmount);
            tx.markPaidByGateway(orderCode, sePayService.getBankCode());
            transactionRepository.save(tx);
            walletService.credit(tx, paidAmount, "Nạp tiền qua SePay, mã " + orderCode);
            return result(true, "SUCCESS", orderCode, "Đã cộng " + paidAmount.toPlainString() + " VND vào ví");
        }

        // 4. Đơn đã đóng (bị từ chối/hoàn) hoặc booking quảng cáo quá hạn giữ chỗ: không cấp quyền, tiền vào ví
        boolean adHoldExpired = tx.getTransactionType() == TransactionType.AD && tx.isExpired(LocalDateTime.now());
        if (tx.getStatus() != TransactionStatus.PENDING || adHoldExpired) {
            tx.markExpired();
            transactionRepository.save(tx);
            return creditToWallet(tx, paidAmount, "LATE",
                    "Tiền về sau khi đơn " + orderCode + " hết hiệu lực, chuyển vào ví",
                    "LATE_PAYMENT_CREDITED_TO_WALLET");
        }

        // 5. Chuyển thiếu
        if (paidAmount.compareTo(tx.getAmount()) < 0) {
            String suffix = "PART-" + (reference != null && !reference.isBlank() ? reference : paidAmount.toBigInteger());
            log.warn("Đơn {} chuyển thiếu: nhận {} / cần {}", orderCode, paidAmount, tx.getAmount());
            return creditToWallet(tx, paidAmount, suffix,
                    "Chuyển thiếu cho đơn " + orderCode + ", tiền đã nhận được cộng vào ví",
                    "UNDERPAID_CREDITED_TO_WALLET");
        }

        // 6. Đủ hoặc thừa
        tx.markPaidByGateway(orderCode, sePayService.getBankCode());
        Transaction savedTx = transactionRepository.save(tx);
        publishPaymentSuccess(savedTx);

        BigDecimal excess = paidAmount.subtract(tx.getAmount());
        if (excess.compareTo(BigDecimal.ZERO) > 0) {
            creditToWallet(tx, excess, "EXCESS", "Chuyển thừa cho đơn " + orderCode + ", phần dư cộng vào ví", "EXCESS");
        }

        Map<String, Object> body = result(true, "SUCCESS", orderCode, "Xác nhận thanh toán thành công");
        body.put("transactionId", savedTx.getTransactionId());
        return body;
    }

    /**
     * Ghi nhận khoản tiền thực nhận nhưng không gắn được vào đơn nào (khiếu nại không có mã đơn,
     * hoặc chuyển thêm vào đơn đã thanh toán): tạo giao dịch TOPUP mã {code} rồi cộng ví.
     * Mã trùng (đã xử lý) thì không cộng lần 2.
     */
    @Transactional
    public Map<String, Object> creditUnmatchedTransfer(Long userId, BigDecimal amount, String code, String reason) {
        if (transactionRepository.existsByGatewayTransactionId(code)) {
            return result(true, "ALREADY_PROCESSED", code, "Khoản tiền này đã được cộng vào ví trước đó");
        }
        Transaction carrier = Transaction.builder().userId(userId).gatewayTransactionId(code).build();
        Map<String, Object> body = creditToWallet(carrier, amount, null, reason, "CREDITED_WALLET");
        return body;
    }

    // =========================================================================
    // HÀM NỘI BỘ
    // =========================================================================

    /**
     * Ghi nhận tiền thực nhận nhưng không gắn được vào đơn: tạo 1 giao dịch TOPUP con với mã
     * {orderCode}-{suffix} rồi cộng ví. UNIQUE gateway_transaction_id khiến webhook lặp lại
     * không thể tạo bản ghi con thứ 2.
     */
    private Map<String, Object> creditToWallet(Transaction origin, BigDecimal amount, String suffix,
                                               String reason, String status) {
        String childCode = suffix == null ? origin.getGatewayTransactionId() : origin.getGatewayTransactionId() + "-" + suffix;
        if (transactionRepository.existsByGatewayTransactionId(childCode)) {
            return result(true, "ALREADY_PROCESSED", origin.getGatewayTransactionId(), "Khoản tiền này đã được cộng vào ví trước đó");
        }

        LocalDateTime now = LocalDateTime.now();
        Transaction child = transactionRepository.save(Transaction.builder()
                .userId(origin.getUserId())
                .transactionType(TransactionType.TOPUP)
                .amount(amount)
                .currency("VND")
                .paymentMethod("SEPAY")
                .bankCode(sePayService.getBankCode())
                .gatewayTransactionId(childCode)
                .description(reason)
                .status(TransactionStatus.SUCCESS)
                .paidAt(now)
                .createdAt(now)
                .build());
        walletService.credit(child, amount, reason);

        log.info("{}: cộng {} VND vào ví user #{} (giao dịch con {})", status, amount, origin.getUserId(), childCode);
        return result(true, status, origin.getGatewayTransactionId(), reason);
    }

    private Transaction.TransactionBuilder newPendingOrder(Long userId, TransactionType type, BigDecimal amount, String description) {
        LocalDateTime now = LocalDateTime.now();
        return Transaction.builder()
                .userId(userId)
                .transactionType(type)
                .amount(amount)
                .currency("VND")
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
        return transactionRepository.findByGatewayTransactionId(orderCode)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng với mã: " + orderCode, HttpStatus.NOT_FOUND));
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
        boolean pending = tx.getStatus() == TransactionStatus.PENDING;
        boolean expired = pending && tx.isExpired(LocalDateTime.now());
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
                .checkoutUrl(sePayService.getCheckoutUrl())
                // Chỉ trả QR khi đơn còn chờ thanh toán và chưa hết hạn
                .qrCodeUrl(pending && !expired ? sePayService.generateVietQrUrl(tx.getGatewayTransactionId(), tx.getAmount()) : null)
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
                .expired(tx.getStatus() == TransactionStatus.PENDING && tx.isExpired(LocalDateTime.now()))
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .paymentMethod(tx.getPaymentMethod())
                .paidAt(tx.getPaidAt())
                .createdAt(tx.getCreatedAt())
                .expiresAt(tx.getExpiresAt())
                .build();
    }

    private Map<String, Object> result(boolean success, String status, String orderCode, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", success);
        body.put("status", status);
        if (orderCode != null) body.put("orderCode", orderCode);
        body.put("message", message);
        return body;
    }
}
