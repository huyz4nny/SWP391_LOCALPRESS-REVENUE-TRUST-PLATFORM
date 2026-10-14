package com.localpress.finance;

import com.localpress.finance.dto.request.CreateOrderRequest;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.finance.service.SePayService;
import com.localpress.shared.event.PaymentSuccessEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * ==============================================================================
 * TEST: BỘ XỬ LÝ THANH TOÁN TỰ ĐỘNG & WEBHOOK SEPAY (SV4 - ITERATION 2)
 * ==============================================================================
 */
@ExtendWith(MockitoExtension.class)
class PaymentProcessingServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Spy
    private SePayService sePayService;

    @InjectMocks
    private PaymentProcessingService paymentProcessingService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(sePayService, "merchantId", "SP-LIVE-NV598A56");
        ReflectionTestUtils.setField(sePayService, "secretKey", "spsk_live_zE8upevaCPoKZApG6tynwKDQAaRnuknP");
        ReflectionTestUtils.setField(sePayService, "env", "production");
        ReflectionTestUtils.setField(sePayService, "bankCode", "VCB");
        ReflectionTestUtils.setField(sePayService, "accountName", "NGUYEN VAN QUANG HUY");
    }

    @Test
    @DisplayName("UC047: Tạo đơn hàng thanh toán thành công, có chữ ký số HMAC-SHA256")
    void testCreateOrder_Success() {
        // Arrange
        CreateOrderRequest request = CreateOrderRequest.builder()
                .orderType("SUBSCRIPTION")
                .targetId(1L)
                .amount(new BigDecimal("150000"))
                .paymentMethod("SEPAY")
                .description("Mua goi doc bao 1 thang")
                .successUrl("https://localpress.vn/checkout/success")
                .build();

        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction tx = invocation.getArgument(0);
            tx.setTransactionId(101L);
            tx.setCreatedAt(LocalDateTime.now());
            return tx;
        });

        // Act
        OrderCreateResponse response = paymentProcessingService.createOrder(7L, request);

        // Assert
        assertNotNull(response);
        assertEquals(101L, response.getTransactionId());
        assertTrue(response.getOrderCode().startsWith("LP"));
        assertEquals(new BigDecimal("150000"), response.getAmount());
        assertEquals("PENDING", response.getStatus());
        assertEquals("https://pay.sepay.vn/v1/checkout/init", response.getCheckoutUrl());
        assertNotNull(response.getCheckoutFields());
        assertTrue(response.getCheckoutFields().containsKey("signature"));
        assertNotNull(response.getQrCodeUrl());

        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }

    @Test
    @DisplayName("UC049: Webhook IPN từ SePay xử lý thành công và phát tán PaymentSuccessEvent")
    void testProcessSepayIpn_Success() {
        // Arrange
        String orderCode = "LP2610141200ABCD";
        Transaction pendingTx = Transaction.builder()
                .transactionId(88L)
                .userId(7L)
                .subscriptionId(2L)
                .transactionType(TransactionType.SUBSCRIPTION)
                .amount(new BigDecimal("50000"))
                .currency("VND")
                .paymentMethod("SEPAY")
                .gatewayTransactionId(orderCode)
                .status(TransactionStatus.PENDING)
                .build();

        when(transactionRepository.findByGatewayTransactionId(orderCode))
                .thenReturn(Optional.of(pendingTx));
        when(transactionRepository.save(any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SepayIpnRequest ipnRequest = SepayIpnRequest.builder()
                .notificationType("ORDER_PAID")
                .order(new SepayIpnRequest.OrderData(
                        "uuid-123", "order-123", orderCode, "CAPTURED",
                        new BigDecimal("50000"), "VND", "Thanh toan don " + orderCode
                ))
                .build();

        // Act
        Map<String, Object> result = paymentProcessingService.processSepayIpn("spsk_live_...", ipnRequest);

        // Assert
        assertTrue((Boolean) result.get("success"));
        assertEquals("SUCCESS", result.get("status"));
        assertEquals(TransactionStatus.SUCCESS, pendingTx.getStatus());
        assertNotNull(pendingTx.getPaidAt());

        ArgumentCaptor<PaymentSuccessEvent> captor = ArgumentCaptor.forClass(PaymentSuccessEvent.class);
        verify(eventPublisher, times(1)).publishEvent(captor.capture());
        PaymentSuccessEvent event = captor.getValue();
        assertEquals(88L, event.getTransactionId());
        assertEquals(7L, event.getUserId());
        assertEquals(2L, event.getTargetId());
        assertEquals("SUBSCRIPTION", event.getTransactionType());
    }

    @Test
    @DisplayName("UC049 (Rule 5): Webhook gửi lại lần 2 không cộng trùng (Idempotent)")
    void testProcessSepayIpn_IdempotentDuplicate() {
        // Arrange
        String orderCode = "LP2610141200ABCD";
        Transaction alreadyPaidTx = Transaction.builder()
                .transactionId(88L)
                .userId(7L)
                .subscriptionId(2L)
                .transactionType(TransactionType.SUBSCRIPTION)
                .amount(new BigDecimal("50000"))
                .status(TransactionStatus.SUCCESS)
                .paidAt(LocalDateTime.now())
                .gatewayTransactionId(orderCode)
                .build();

        when(transactionRepository.findByGatewayTransactionId(orderCode))
                .thenReturn(Optional.of(alreadyPaidTx));

        SepayIpnRequest ipnRequest = SepayIpnRequest.builder()
                .content("Thanh toan " + orderCode)
                .amount(new BigDecimal("50000"))
                .build();

        // Act
        Map<String, Object> result = paymentProcessingService.processSepayIpn(null, ipnRequest);

        // Assert
        assertTrue((Boolean) result.get("success"));
        assertEquals("ALREADY_PROCESSED", result.get("status"));

        // Tuyệt đối không lưu lại hoặc bắn sự kiện lần 2
        verify(transactionRepository, never()).save(any(Transaction.class));
        verify(eventPublisher, never()).publishEvent(any(PaymentSuccessEvent.class));
    }
}
