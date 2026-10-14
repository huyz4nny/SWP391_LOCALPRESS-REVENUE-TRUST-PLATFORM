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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

/**
 * ==============================================================================
 * DỊCH VỤ XỬ LÝ THANH TOÁN TẬP TRUNG (SV4 - PAYMENT PROCESSING SERVICE)
 * ==============================================================================
 * Phục vụ các Use Case của Iteration 2:
 * - UC047: Tạo phiên giao dịch thanh toán cho Reader (SV3) & Advertiser (SV1).
 * - UC048: Xác minh kết quả thanh toán & đối chiếu số tiền.
 * - UC049: Xử lý Webhook IPN từ Cổng thanh toán SePay với cơ chế chống trùng Idempotency.
 * - UC050: Kiểm tra và cung cấp trạng thái giao dịch cho Frontend polling.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentProcessingService {

    private final TransactionRepository transactionRepository;
    private final SePayService sePayService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * UC047: Khởi tạo đơn hàng thanh toán mới và sinh link/mã QR cổng SePay.
     */
    @Transactional
    public OrderCreateResponse createOrder(Long userId, CreateOrderRequest request) {
        log.info("Tạo đơn hàng thanh toán mới: user={}, type={}, targetId={}, amount={}",
                userId, request.getOrderType(), request.getTargetId(), request.getAmount());

        // 1. Phân loại loại giao dịch (hỗ trợ linh hoạt cả ARTICLE_PURCHASE và AD_CAMPAIGN từ Frontend)
        String rawType = request.getOrderType() != null ? request.getOrderType().toUpperCase().trim() : "";
        if ("ARTICLE_PURCHASE".equals(rawType)) rawType = "ARTICLE";
        if ("AD_CAMPAIGN".equals(rawType)) rawType = "AD";

        TransactionType type;
        try {
            type = TransactionType.valueOf(rawType);
        } catch (IllegalArgumentException e) {
            throw new AppException("Loại giao dịch không hợp lệ: " + request.getOrderType(), HttpStatus.BAD_REQUEST);
        }

        // 2. Sinh mã đơn hàng duy nhất (độ dài vừa phải để quét QR ngân hàng không bị cắt ngắn)
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmm"));
        String randomSuffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        String orderCode = "LP" + timestamp + randomSuffix;

        // 3. Khởi tạo thực thể Transaction theo đúng ràng buộc CHECK constraint của CSDL
        Transaction.TransactionBuilder txBuilder = Transaction.builder()
                .userId(userId)
                .transactionType(type)
                .amount(request.getAmount())
                .currency("VND")
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "SEPAY")
                .bankCode(request.getBankCode() != null ? request.getBankCode() : "VCB")
                .gatewayTransactionId(orderCode)
                .status(TransactionStatus.PENDING);

        // Gán đúng Scalar Foreign Key theo từng phân hệ
        switch (type) {
            case SUBSCRIPTION -> txBuilder.subscriptionId(request.getTargetId());
            case ARTICLE -> txBuilder.purchaseId(request.getTargetId());
            case AD -> txBuilder.campaignId(request.getTargetId());
            case REFUND -> txBuilder.originalTransactionId(request.getTargetId());
        }

        Transaction savedTx = transactionRepository.save(txBuilder.build());
        log.info("Đã tạo bản ghi Transaction #{} với mã đơn: {}", savedTx.getTransactionId(), orderCode);

        // 4. Sinh trường dữ liệu form và chữ ký số HMAC-SHA256 theo chuẩn SePay PG
        Map<String, Object> checkoutFields = sePayService.buildOneTimePaymentFields(
                orderCode,
                savedTx.getAmount(),
                request.getDescription() != null ? request.getDescription() : "Thanh toan don " + orderCode,
                request.getSuccessUrl(),
                request.getErrorUrl(),
                request.getCancelUrl()
        );

        // 5. Sinh link ảnh VietQR trực tiếp của Vietcombank
        String qrCodeUrl = sePayService.generateVietQrUrl(orderCode, savedTx.getAmount());

        return OrderCreateResponse.builder()
                .transactionId(savedTx.getTransactionId())
                .orderCode(orderCode)
                .amount(savedTx.getAmount())
                .currency(savedTx.getCurrency())
                .status(savedTx.getStatus().name())
                .paymentMethod(savedTx.getPaymentMethod())
                .description(request.getDescription())
                .checkoutUrl(sePayService.getCheckoutUrl())
                .checkoutFields(checkoutFields)
                .qrCodeUrl(qrCodeUrl)
                .createdAt(savedTx.getCreatedAt())
                .build();
    }

    /**
     * UC050: Tra cứu trạng thái đơn hàng theo ID (Dành cho polling hoặc trang Payment Success).
     */
    @Transactional(readOnly = true)
    public OrderStatusResponse getOrderStatus(Long transactionId) {
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng #" + transactionId, HttpStatus.NOT_FOUND));

        return OrderStatusResponse.builder()
                .transactionId(tx.getTransactionId())
                .orderCode(tx.getGatewayTransactionId())
                .status(tx.getStatus().name())
                .isPaid(tx.getStatus() == TransactionStatus.SUCCESS)
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .paymentMethod(tx.getPaymentMethod())
                .paidAt(tx.getPaidAt())
                .createdAt(tx.getCreatedAt())
                .build();
    }

    /**
     * UC050: Tra cứu trạng thái đơn hàng theo mã đơn `orderCode`.
     */
    @Transactional(readOnly = true)
    public OrderStatusResponse getOrderStatusByCode(String orderCode) {
        Transaction tx = transactionRepository.findByGatewayTransactionId(orderCode)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng với mã: " + orderCode, HttpStatus.NOT_FOUND));

        return OrderStatusResponse.builder()
                .transactionId(tx.getTransactionId())
                .orderCode(tx.getGatewayTransactionId())
                .status(tx.getStatus().name())
                .isPaid(tx.getStatus() == TransactionStatus.SUCCESS)
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .paymentMethod(tx.getPaymentMethod())
                .paidAt(tx.getPaidAt())
                .createdAt(tx.getCreatedAt())
                .build();
    }

    /**
     * UC048 & UC049: Tiếp nhận và xử lý Webhook IPN từ SePay.
     * Áp dụng nguyên tắc bất biến Rule 4 (Xác minh độc lập) và Rule 5 (Idempotency).
     */
    @Transactional
    public Map<String, Object> processSepayIpn(String secretKeyHeader, SepayIpnRequest ipnRequest) {
        log.info("Nhận Webhook IPN từ SePay: headerKey={}, payload={}", secretKeyHeader, ipnRequest);

        // 1. Trích xuất mã đơn hàng từ nội dung thanh toán
        String orderCode = ipnRequest.resolveOrderCode();
        if (orderCode == null || orderCode.isBlank()) {
            log.warn("Webhook IPN không chứa mã đơn hàng hợp lệ.");
            return Map.of("success", false, "message", "Không tìm thấy mã đơn hàng trong payload");
        }

        // 2. Tra cứu giao dịch trong bảng transactions
        Transaction tx = transactionRepository.findByGatewayTransactionId(orderCode)
                .orElse(null);

        if (tx == null) {
            log.warn("Không tìm thấy giao dịch nào khớp với mã đơn hàng: {}", orderCode);
            return Map.of("success", false, "message", "Đơn hàng không tồn tại: " + orderCode);
        }

        // 3. Kiểm tra tính Idempotent (Rule 5: Webhook gửi lại nhiều lần không cộng trùng)
        if (tx.getStatus() == TransactionStatus.SUCCESS) {
            log.info("Giao dịch #{} ({}) đã được xác nhận thanh toán trước đó. Bỏ qua để chống cộng trùng (Idempotent Hit).",
                    tx.getTransactionId(), orderCode);
            return Map.of(
                    "success", true,
                    "status", "ALREADY_PROCESSED",
                    "orderCode", orderCode,
                    "message", "Giao dịch đã được ghi nhận trước đó"
            );
        }

        // 4. Xác minh số tiền thanh toán (UC048)
        BigDecimal paidAmount = ipnRequest.resolveAmount();
        if (paidAmount.compareTo(BigDecimal.ZERO) > 0 && paidAmount.compareTo(tx.getAmount()) < 0) {
            log.warn("Số tiền chuyển khoản ({}) nhỏ hơn giá trị đơn hàng ({}) của đơn #{}",
                    paidAmount, tx.getAmount(), tx.getTransactionId());
            // Có thể ghi nhận vào bảng lệch tiền để Kế toán đối soát ở UC054
        }

        // 5. Cập nhật trạng thái giao dịch sang SUCCESS
        tx.markPaidByGateway(orderCode, "VCB");
        Transaction savedTx = transactionRepository.save(tx);
        log.info("Giao dịch #{} đã cập nhật SUCCESS thành công vào lúc {}", savedTx.getTransactionId(), savedTx.getPaidAt());

        // 6. Phát tán sự kiện miền PaymentSuccessEvent để SV1 (Ad) hoặc SV3 (Reader) tự kích hoạt quyền lợi
        PaymentSuccessEvent event = PaymentSuccessEvent.builder()
                .transactionId(savedTx.getTransactionId())
                .userId(savedTx.getUserId())
                .transactionType(savedTx.getTransactionType().name())
                .targetId(savedTx.resolveTargetId())
                .amount(savedTx.getAmount())
                .currency(savedTx.getCurrency())
                .paymentMethod(savedTx.getPaymentMethod())
                .gatewayTransactionId(savedTx.getGatewayTransactionId())
                .paidAt(savedTx.getPaidAt())
                .build();

        eventPublisher.publishEvent(event);
        log.info("Đã phát tán sự kiện PaymentSuccessEvent cho giao dịch #{}, target: {}#{}",
                savedTx.getTransactionId(), savedTx.getTransactionType(), savedTx.resolveTargetId());

        return Map.of(
                "success", true,
                "status", "SUCCESS",
                "orderCode", orderCode,
                "transactionId", savedTx.getTransactionId(),
                "message", "Xác nhận thanh toán thành công"
        );
    }
}
