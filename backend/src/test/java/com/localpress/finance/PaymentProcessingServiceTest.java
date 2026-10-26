package com.localpress.finance;

import com.localpress.finance.dto.request.CreateOrderRequest;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.finance.service.SePayService;
import com.localpress.finance.service.WalletService;
import com.localpress.shared.event.PaymentSuccessEvent;
import com.localpress.shared.exception.AppException;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * ==============================================================================
 * TEST: BỘ XỬ LÝ THANH TOÁN, VÍ & WEBHOOK SEPAY (SV4)
 * ==============================================================================
 */
@ExtendWith(MockitoExtension.class)
class PaymentProcessingServiceTest {

    private static final String ORDER_CODE = "LP2610141200ABCD";

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private WalletService walletService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Spy
    private SePayService sePayService;

    @InjectMocks
    private PaymentProcessingService paymentProcessingService;

    private final FinanceCurrentUser.Principal reader = new FinanceCurrentUser.Principal(7L, "READER");
    private final FinanceCurrentUser.Principal otherReader = new FinanceCurrentUser.Principal(8L, "READER");

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(sePayService, "merchantId", "SP-TEST");
        ReflectionTestUtils.setField(sePayService, "secretKey", "test-secret");
        ReflectionTestUtils.setField(sePayService, "webhookApiKey", "test-webhook-key");
        ReflectionTestUtils.setField(sePayService, "env", "sandbox");
        ReflectionTestUtils.setField(sePayService, "bankCode", "VCB");
        ReflectionTestUtils.setField(sePayService, "bankShortName", "vietcombank");
        ReflectionTestUtils.setField(sePayService, "accountNumber", "9981");
        ReflectionTestUtils.setField(sePayService, "accountName", "LOCALPRESS TEST");
    }

    private Transaction pending(TransactionType type, String amount) {
        Transaction.TransactionBuilder b = Transaction.builder()
                .transactionId(88L)
                .userId(7L)
                .transactionType(type)
                .amount(new BigDecimal(amount))
                .currency("VND")
                .paymentMethod("SEPAY")
                .gatewayTransactionId(ORDER_CODE)
                .status(TransactionStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(15));
        switch (type) {
            case SUBSCRIPTION -> b.subscriptionId(2L);
            case ARTICLE -> b.purchaseId(3L);
            case AD -> b.campaignId(4L);
            default -> { }
        }
        return b.build();
    }

    private SepayIpnRequest ipn(String amount) {
        return SepayIpnRequest.builder()
                .content("LOCALPRESS " + ORDER_CODE)
                .amount(new BigDecimal(amount))
                .referenceCode("FT123")
                .build();
    }

    private void stubLockedOrder(Transaction tx) {
        when(transactionRepository.findByGatewayTransactionIdForUpdate(ORDER_CODE)).thenReturn(Optional.of(tx));
    }

    private void stubSaveEcho() {
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
            Transaction t = inv.getArgument(0);
            if (t.getTransactionId() == null) t.setTransactionId(999L);
            return t;
        });
    }

    @Test
    @DisplayName("UC047: Tạo đơn trả về QR theo cấu hình ngân hàng, hạn 15 phút, mô tả lấy từ targetTitle")
    void createOrder_returnsPaymentView() {
        stubSaveEcho();
        CreateOrderRequest request = CreateOrderRequest.builder()
                .orderType("SUBSCRIPTION")
                .targetId(1L)
                .amount(new BigDecimal("150000"))
                .targetTitle("Gói tháng")
                .build();

        OrderCreateResponse response = paymentProcessingService.createOrder(7L, request);

        assertTrue(response.getOrderCode().startsWith("LP"));
        assertEquals("SUBSCRIPTION", response.getOrderType());
        assertEquals("Gói tháng", response.getDescription());
        assertEquals("PENDING", response.getStatus());
        assertEquals(response.getOrderCode(), response.getTransferContent());
        assertTrue(response.getQrCodeUrl().contains("vietcombank-9981"));
        assertNotNull(response.getExpiresAt());
        assertTrue(response.getCheckoutFields().containsKey("signature"));
    }

    @Test
    @DisplayName("Nạp ví: số tiền ngoài hạn mức bị từ chối")
    void createTopUp_rejectsOutOfRange() {
        AppException ex = assertThrows(AppException.class,
                () -> paymentProcessingService.createTopUp(7L, new BigDecimal("5000")));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("UC049: Webhook đủ tiền -> SUCCESS và phát PaymentSuccessEvent")
    void ipn_fullAmount_success() {
        Transaction tx = pending(TransactionType.SUBSCRIPTION, "50000");
        stubLockedOrder(tx);
        stubSaveEcho();

        Map<String, Object> result = paymentProcessingService.processSepayIpn(ipn("50000"));

        assertEquals("SUCCESS", result.get("status"));
        assertEquals(TransactionStatus.SUCCESS, tx.getStatus());
        ArgumentCaptor<PaymentSuccessEvent> captor = ArgumentCaptor.forClass(PaymentSuccessEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertEquals(2L, captor.getValue().getTargetId());
        verify(walletService, never()).credit(any(), any(), anyString());
    }

    @Test
    @DisplayName("UC049 (Rule 5): Webhook lặp lại -> ALREADY_PROCESSED, không lưu, không bắn event")
    void ipn_duplicate_isIdempotent() {
        Transaction tx = pending(TransactionType.SUBSCRIPTION, "50000");
        tx.setStatus(TransactionStatus.SUCCESS);
        stubLockedOrder(tx);

        Map<String, Object> result = paymentProcessingService.processSepayIpn(ipn("50000"));

        assertEquals("ALREADY_PROCESSED", result.get("status"));
        verify(transactionRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Webhook đơn không tồn tại -> ORDER_NOT_FOUND, không ghi gì")
    void ipn_unknownOrder() {
        when(transactionRepository.findByGatewayTransactionIdForUpdate(ORDER_CODE)).thenReturn(Optional.empty());

        Map<String, Object> result = paymentProcessingService.processSepayIpn(ipn("50000"));

        assertEquals("ORDER_NOT_FOUND", result.get("status"));
        verify(transactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Nạp ví: webhook cộng đúng số tiền thực nhận vào ví")
    void ipn_topUp_creditsWallet() {
        Transaction tx = pending(TransactionType.TOPUP, "100000");
        stubLockedOrder(tx);
        stubSaveEcho();

        Map<String, Object> result = paymentProcessingService.processSepayIpn(ipn("100000"));

        assertEquals("SUCCESS", result.get("status"));
        verify(walletService).credit(eq(tx), eq(new BigDecimal("100000")), anyString());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Rule 6: Booking quảng cáo quá hạn giữ chỗ -> không cấp quyền, tiền vào ví")
    void ipn_lateAdPayment_creditsWallet() {
        Transaction tx = pending(TransactionType.AD, "2000000");
        tx.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        stubLockedOrder(tx);
        stubSaveEcho();

        Map<String, Object> result = paymentProcessingService.processSepayIpn(ipn("2000000"));

        assertEquals("LATE_PAYMENT_CREDITED_TO_WALLET", result.get("status"));
        assertEquals(TransactionStatus.FAILED, tx.getStatus());
        verify(walletService).credit(argThat(t -> (ORDER_CODE + "-LATE").equals(t.getGatewayTransactionId())),
                eq(new BigDecimal("2000000")), anyString());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Chuyển thiếu -> đơn vẫn PENDING, số tiền đã nhận vào ví")
    void ipn_underpaid_creditsWallet() {
        Transaction tx = pending(TransactionType.ARTICLE, "15000");
        stubLockedOrder(tx);
        stubSaveEcho();

        Map<String, Object> result = paymentProcessingService.processSepayIpn(ipn("10000"));

        assertEquals("UNDERPAID_CREDITED_TO_WALLET", result.get("status"));
        assertEquals(TransactionStatus.PENDING, tx.getStatus());
        verify(walletService).credit(any(), eq(new BigDecimal("10000")), anyString());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Chuyển thừa -> đơn SUCCESS, phần dư vào ví")
    void ipn_overpaid_creditsExcess() {
        Transaction tx = pending(TransactionType.ARTICLE, "15000");
        stubLockedOrder(tx);
        stubSaveEcho();

        Map<String, Object> result = paymentProcessingService.processSepayIpn(ipn("20000"));

        assertEquals("SUCCESS", result.get("status"));
        verify(eventPublisher).publishEvent(any(PaymentSuccessEvent.class));
        verify(walletService).credit(any(), eq(new BigDecimal("5000")), anyString());
    }

    @Test
    @DisplayName("Trả bằng ví: trừ ví, đơn SUCCESS, phát event với paymentMethod WALLET")
    void payWithWallet_success() {
        Transaction tx = pending(TransactionType.ARTICLE, "15000");
        stubLockedOrder(tx);
        stubSaveEcho();

        paymentProcessingService.payWithWallet(reader, ORDER_CODE);

        verify(walletService).debit(eq(tx), eq(new BigDecimal("15000")), anyString());
        assertEquals(TransactionStatus.SUCCESS, tx.getStatus());
        assertEquals("WALLET", tx.getPaymentMethod());
        verify(eventPublisher).publishEvent(any(PaymentSuccessEvent.class));
    }

    @Test
    @DisplayName("Trả bằng ví: số dư không đủ -> 402, đơn giữ PENDING, không bắn event")
    void payWithWallet_insufficientBalance() {
        Transaction tx = pending(TransactionType.ARTICLE, "15000");
        stubLockedOrder(tx);
        doThrow(new AppException("Số dư ví không đủ", HttpStatus.PAYMENT_REQUIRED))
                .when(walletService).debit(any(), any(), anyString());

        AppException ex = assertThrows(AppException.class, () -> paymentProcessingService.payWithWallet(reader, ORDER_CODE));

        assertEquals(HttpStatus.PAYMENT_REQUIRED, ex.getStatus());
        assertEquals(TransactionStatus.PENDING, tx.getStatus());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Rule 14: Người khác đoán đúng mã đơn -> 403 khi xem và khi trả bằng ví")
    void otherUser_forbidden() {
        Transaction tx = pending(TransactionType.ARTICLE, "15000");
        when(transactionRepository.findByGatewayTransactionId(ORDER_CODE)).thenReturn(Optional.of(tx));
        stubLockedOrder(tx);

        AppException view = assertThrows(AppException.class,
                () -> paymentProcessingService.getPaymentView(otherReader, ORDER_CODE));
        AppException pay = assertThrows(AppException.class,
                () -> paymentProcessingService.payWithWallet(otherReader, ORDER_CODE));

        assertEquals(HttpStatus.FORBIDDEN, view.getStatus());
        assertEquals(HttpStatus.FORBIDDEN, pay.getStatus());
        verify(walletService, never()).debit(any(), any(), anyString());
    }

    @Test
    @DisplayName("Webhook: chỉ chấp nhận đúng API key, có hoặc không tiền tố Apikey")
    void verifyWebhookKey() {
        assertTrue(sePayService.verifyIpnSecretKey("Apikey test-webhook-key"));
        assertTrue(sePayService.verifyIpnSecretKey("test-webhook-key"));
        assertFalse(sePayService.verifyIpnSecretKey("Apikey wrong"));
        assertFalse(sePayService.verifyIpnSecretKey(null));
    }

    // =========================================================================
    // MỌI THANH TOÁN QUA VÍ: NẠP BÙ GẮN ĐƠN + TỰ TRẢ KHI TIỀN VỀ (V6)
    // =========================================================================

    private static final String TOPUP_CODE = "LP2610221000TOPU";

    private Transaction linkedTopUp(String amount) {
        return Transaction.builder()
                .transactionId(77L).userId(7L).transactionType(TransactionType.TOPUP)
                .amount(new BigDecimal(amount)).currency("VND").paymentMethod("SEPAY")
                .gatewayTransactionId(TOPUP_CODE).topupForOrder(ORDER_CODE)
                .status(TransactionStatus.PENDING).createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(15)).build();
    }

    @Test
    @DisplayName("Ví thiếu: tạo mã nạp bù đúng phần còn thiếu, gắn mã đơn")
    void shortfallTopUpIsExactAndLinked() {
        Transaction order = pending(TransactionType.ARTICLE, "15000");
        when(transactionRepository.findByGatewayTransactionId(ORDER_CODE)).thenReturn(Optional.of(order));
        when(walletService.findByUserId(7L)).thenReturn(Optional.of(com.localpress.finance.model.Wallet.builder()
                .userId(7L).balance(new BigDecimal("4000")).build()));
        when(transactionRepository.findFirstByTopupForOrderAndStatusOrderByCreatedAtDesc(ORDER_CODE, TransactionStatus.PENDING))
                .thenReturn(Optional.empty());
        stubSaveEcho();

        OrderCreateResponse view = paymentProcessingService.createShortfallTopUp(reader, ORDER_CODE);

        assertEquals(0, view.getAmount().compareTo(new BigDecimal("11000")));
        assertEquals("TOPUP", view.getOrderType());
        assertEquals(ORDER_CODE, view.getTopupForOrder());
    }

    @Test
    @DisplayName("Ví đã đủ: không tạo mã nạp bù (409)")
    void noShortfallWhenWalletEnough() {
        Transaction order = pending(TransactionType.ARTICLE, "15000");
        when(transactionRepository.findByGatewayTransactionId(ORDER_CODE)).thenReturn(Optional.of(order));
        when(walletService.findByUserId(7L)).thenReturn(Optional.of(com.localpress.finance.model.Wallet.builder()
                .userId(7L).balance(new BigDecimal("20000")).build()));

        AppException ex = assertThrows(AppException.class, () -> paymentProcessingService.createShortfallTopUp(reader, ORDER_CODE));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    @DisplayName("Tiền nạp bù về: cộng ví rồi tự trả đơn, phát PaymentSuccessEvent")
    void linkedTopUpAutoPaysOrder() {
        Transaction topup = linkedTopUp("11000");
        Transaction order = pending(TransactionType.ARTICLE, "15000");
        when(transactionRepository.findByGatewayTransactionIdForUpdate(TOPUP_CODE)).thenReturn(Optional.of(topup));
        stubLockedOrder(order);
        when(walletService.lockedBalance(7L)).thenReturn(new BigDecimal("15000"));
        stubSaveEcho();

        Map<String, Object> r = paymentProcessingService.processSepayIpn(SepayIpnRequest.builder()
                .content(TOPUP_CODE).amount(new BigDecimal("11000")).referenceCode("FT9").build());

        assertEquals("SUCCESS", r.get("status"));
        assertEquals("PAID", r.get("autoPay"));
        assertEquals(TransactionStatus.SUCCESS, order.getStatus());
        assertEquals("WALLET", order.getPaymentMethod());
        verify(walletService).credit(eq(topup), any(), anyString());
        verify(walletService).debit(eq(order), any(), anyString());
        verify(eventPublisher).publishEvent(any(PaymentSuccessEvent.class));
    }

    @Test
    @DisplayName("Nạp bù về nhưng ví vẫn thiếu: giữ tiền trong ví, đơn vẫn chờ, không trừ ví")
    void linkedTopUpInsufficientKeepsOrderPending() {
        Transaction topup = linkedTopUp("11000");
        Transaction order = pending(TransactionType.ARTICLE, "15000");
        when(transactionRepository.findByGatewayTransactionIdForUpdate(TOPUP_CODE)).thenReturn(Optional.of(topup));
        stubLockedOrder(order);
        when(walletService.lockedBalance(7L)).thenReturn(new BigDecimal("9000"));
        stubSaveEcho();

        Map<String, Object> r = paymentProcessingService.processSepayIpn(SepayIpnRequest.builder()
                .content(TOPUP_CODE).amount(new BigDecimal("5000")).referenceCode("FT10").build());

        assertEquals("INSUFFICIENT", r.get("autoPay"));
        assertEquals(TransactionStatus.PENDING, order.getStatus());
        verify(walletService, never()).debit(any(), any(), anyString());
    }

    @Test
    @DisplayName("Đơn của tôi: lọc theo loại (nhận cả alias ARTICLE_PURCHASE), trả targetId = purchase_id")
    void getMyOrders_filtersByTypeAndMapsTarget() {
        Transaction tx = pending(TransactionType.ARTICLE, "15000");
        tx.setDescription("Mua bài điều tra");
        when(transactionRepository.findMyOrders(eq(7L), eq(TransactionType.ARTICLE), any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(tx), inv.getArgument(2), 1));

        Page<OrderStatusResponse> result = paymentProcessingService.getMyOrders(7L, "article_purchase", 0, 20);

        assertEquals(1, result.getTotalElements());
        OrderStatusResponse order = result.getContent().get(0);
        assertEquals("ARTICLE", order.getOrderType());
        assertEquals(3L, order.getTargetId());
        assertEquals("Mua bài điều tra", order.getDescription());
        assertEquals(ORDER_CODE, order.getOrderCode());
    }

    @Test
    @DisplayName("Đơn của tôi: không lọc loại, trang âm về 0, size bị chặn 100, mới nhất trước")
    void getMyOrders_clampsPagingAndSortsNewestFirst() {
        when(transactionRepository.findMyOrders(eq(7L), eq(null), any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(), inv.getArgument(2), 0));

        paymentProcessingService.getMyOrders(7L, " ", -3, 500);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(transactionRepository).findMyOrders(eq(7L), eq(null), captor.capture());
        Pageable pageable = captor.getValue();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(100, pageable.getPageSize());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("createdAt").getDirection());
    }

    @Test
    @DisplayName("Đơn của tôi: loại không hợp lệ trả 400, không truy vấn DB")
    void getMyOrders_rejectsUnknownType() {
        AppException ex = assertThrows(AppException.class,
                () -> paymentProcessingService.getMyOrders(7L, "BOOK", 0, 20));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(transactionRepository, never()).findMyOrders(any(), any(), any());
    }
}
