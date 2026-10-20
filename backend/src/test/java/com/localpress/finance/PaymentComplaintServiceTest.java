package com.localpress.finance;

import com.localpress.finance.dto.request.CreateComplaintRequest;
import com.localpress.finance.model.PaymentComplaint;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.PaymentComplaintRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.PaymentComplaintService;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.shared.exception.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TEST: KHIẾU NẠI THANH TOÁN CHƯA GHI NHẬN (SV4 - UC051)
 */
@ExtendWith(MockitoExtension.class)
class PaymentComplaintServiceTest {

    private static final String ORDER = "LP2610201200ABCD";

    @Mock private PaymentComplaintRepository complaintRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private PaymentProcessingService paymentProcessingService;
    @InjectMocks private PaymentComplaintService service;

    private Transaction order(long ownerId, TransactionStatus status) {
        return Transaction.builder().transactionId(1L).userId(ownerId).transactionType(TransactionType.ARTICLE)
                .purchaseId(1L).amount(new BigDecimal("15000")).gatewayTransactionId(ORDER).status(status)
                .expiresAt(LocalDateTime.now().plusMinutes(10)).build();
    }

    private PaymentComplaint open(String orderCode) {
        return PaymentComplaint.builder().complaintId(9L).userId(6L).orderCode(orderCode)
                .amount(new BigDecimal("15000")).transferredAt(LocalDateTime.now()).bankReference("FT123").build();
    }

    private CreateComplaintRequest request(String orderCode) {
        return CreateComplaintRequest.builder().orderCode(orderCode).amount(new BigDecimal("15000"))
                .transferredAt(LocalDateTime.now()).bankReference("ft123").build();
    }

    @Test
    @DisplayName("Gửi khiếu nại: mã GD đã khiếu nại trước đó -> 409")
    void create_duplicateReference() {
        when(complaintRepository.existsByBankReference("FT123")).thenReturn(true);
        AppException ex = assertThrows(AppException.class, () -> service.create(6L, request(null)));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    @DisplayName("Rule 14: Khiếu nại cho đơn của người khác -> 403")
    void create_otherUsersOrder() {
        when(transactionRepository.findByGatewayTransactionId(ORDER)).thenReturn(Optional.of(order(7L, TransactionStatus.PENDING)));
        AppException ex = assertThrows(AppException.class, () -> service.create(6L, request(ORDER)));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Ghi nhận vào đơn: chạy đúng luồng webhook với mã GD ngân hàng của khách")
    void resolve_order_runsWebhookFlow() {
        PaymentComplaint c = open(ORDER);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(paymentProcessingService.processSepayIpn(argThat(ipn ->
                ORDER.equals(ipn.resolveOrderCode()) && "FT123".equals(ipn.getReferenceCode()))))
                .thenReturn(Map.of("status", "SUCCESS"));
        when(complaintRepository.save(c)).thenReturn(c);

        service.resolve(9L, 2L, null, "Khớp sao kê VCB");

        assertEquals(PaymentComplaint.Status.RESOLVED, c.getStatus());
        assertEquals("SUCCESS", c.getResolution());
        assertEquals(2L, c.getResolvedBy());
    }

    @Test
    @DisplayName("Ghi nhận vào đơn đã thanh toán -> 409, gợi ý cộng vào ví")
    void resolve_order_alreadyPaid() {
        PaymentComplaint c = open(ORDER);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(paymentProcessingService.processSepayIpn(any())).thenReturn(Map.of("status", "ALREADY_PROCESSED"));

        AppException ex = assertThrows(AppException.class, () -> service.resolve(9L, 2L, PaymentComplaintService.Target.ORDER, null));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(PaymentComplaint.Status.OPEN, c.getStatus());
    }

    @Test
    @DisplayName("Cộng ví khi đơn vẫn đang chờ -> 409 (tránh webhook về sau ghi nhận lần 2)")
    void resolve_wallet_whileOrderPending() {
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(open(ORDER)));
        when(transactionRepository.findByGatewayTransactionId(ORDER)).thenReturn(Optional.of(order(6L, TransactionStatus.PENDING)));

        AppException ex = assertThrows(AppException.class, () -> service.resolve(9L, 2L, PaymentComplaintService.Target.WALLET, null));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(paymentProcessingService, never()).creditUnmatchedTransfer(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Khiếu nại không có mã đơn -> cộng ví với mã CMP-{mã GD}")
    void resolve_noOrder_creditsWallet() {
        PaymentComplaint c = open(null);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(paymentProcessingService.creditUnmatchedTransfer(eq(6L), eq(new BigDecimal("15000")), eq("CMP-FT123"), anyString()))
                .thenReturn(Map.of("status", "CREDITED_WALLET"));
        when(complaintRepository.save(c)).thenReturn(c);

        service.resolve(9L, 2L, null, null);

        assertEquals("CREDITED_WALLET", c.getResolution());
    }

    @Test
    @DisplayName("Từ chối bắt buộc có lý do; khiếu nại đã xử lý không xử lý lại")
    void reject_rules() {
        PaymentComplaint c = open(ORDER);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));

        AppException noReason = assertThrows(AppException.class, () -> service.reject(9L, 2L, " "));
        assertEquals(HttpStatus.BAD_REQUEST, noReason.getStatus());

        when(complaintRepository.save(c)).thenReturn(c);
        service.reject(9L, 2L, "Không thấy khoản tiền trên sao kê ngày 20/10");
        assertEquals(PaymentComplaint.Status.REJECTED, c.getStatus());

        AppException again = assertThrows(AppException.class, () -> service.reject(9L, 2L, "lần 2"));
        assertEquals(HttpStatus.CONFLICT, again.getStatus());
    }
}
