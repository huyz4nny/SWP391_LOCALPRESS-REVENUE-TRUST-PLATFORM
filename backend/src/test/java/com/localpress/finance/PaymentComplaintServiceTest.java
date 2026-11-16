package com.localpress.finance;

import com.localpress.finance.dto.request.CreateComplaintRequest;
import com.localpress.finance.model.PaymentComplaint;
import com.localpress.finance.model.SepayWebhookLog;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.PaymentComplaintRepository;
import com.localpress.finance.repository.ReconciliationItemRepository;
import com.localpress.finance.repository.SepayWebhookLogRepository;
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
    @Mock private SepayWebhookLogRepository sepayLogRepository;
    @Mock private ReconciliationItemRepository reconciliationItemRepository;
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
    @DisplayName("PAY-03: SePay báo mã GD là 1.000 đ, khách khai 15.000 đ -> 409, không chạy luồng ghi nhận")
    void resolve_order_amountDiffersFromSepayLog() {
        PaymentComplaint c = open(ORDER);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(sepayLogRepository.findFirstByReferenceCodeAndAuthOkTrueAndTransferAmountNotNullOrderByReceivedAtAsc("FT123"))
                .thenReturn(Optional.of(SepayWebhookLog.builder().referenceCode("FT123")
                        .transferAmount(new BigDecimal("1000")).resultStatus("AMOUNT_MISMATCH").build()));

        AppException ex = assertThrows(AppException.class, () -> service.resolve(9L, 2L, PaymentComplaintService.Target.ORDER, null));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(PaymentComplaint.Status.OPEN, c.getStatus());
        verify(paymentProcessingService, never()).processSepayIpn(any());
    }

    @Test
    @DisplayName("Ghi nhận vào đơn đã thanh toán -> 409, gợi ý chuyển trả khách")
    void resolve_order_alreadyPaid() {
        PaymentComplaint c = open(ORDER);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(paymentProcessingService.processSepayIpn(any())).thenReturn(Map.of("status", "ALREADY_PROCESSED"));

        AppException ex = assertThrows(AppException.class, () -> service.resolve(9L, 2L, PaymentComplaintService.Target.ORDER, null));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(PaymentComplaint.Status.OPEN, c.getStatus());
    }

    @Test
    @DisplayName("Ghi nhận vào đơn nhưng sai số tiền -> 409, không ghi gì, gợi ý chuyển trả khách")
    void resolve_order_amountMismatch() {
        PaymentComplaint c = open(ORDER);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(paymentProcessingService.processSepayIpn(any()))
                .thenReturn(Map.of("status", "AMOUNT_MISMATCH", "message", "Chuyển 15000 VND, đơn cần 20000 VND"));

        AppException ex = assertThrows(AppException.class, () -> service.resolve(9L, 2L, PaymentComplaintService.Target.ORDER, null));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(PaymentComplaint.Status.OPEN, c.getStatus());
    }

    @Test
    @DisplayName("Chuyển trả khách khi đơn vẫn chờ đúng số tiền -> 409 (phải ghi vào đơn)")
    void resolve_returned_whileOrderPending() {
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(open(ORDER)));
        when(transactionRepository.findByGatewayTransactionId(ORDER)).thenReturn(Optional.of(order(6L, TransactionStatus.PENDING)));

        AppException ex = assertThrows(AppException.class,
                () -> service.resolve(9L, 2L, PaymentComplaintService.Target.RETURNED, "Đã trả FT999"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(paymentProcessingService, never()).processSepayIpn(any());
    }

    @Test
    @DisplayName("Khiếu nại không có mã đơn -> kế toán chuyển trả khách, bắt buộc ghi mã GD trả")
    void resolve_noOrder_returnedToCustomer() {
        PaymentComplaint c = open(null);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));

        AppException noRef = assertThrows(AppException.class, () -> service.resolve(9L, 2L, null, null));
        assertEquals(HttpStatus.BAD_REQUEST, noRef.getStatus());

        when(complaintRepository.save(c)).thenReturn(c);
        service.resolve(9L, 2L, null, "Đã chuyển trả, mã GD FT999");

        assertEquals(PaymentComplaintService.RETURNED_TO_CUSTOMER, c.getResolution());
        verify(paymentProcessingService, never()).processSepayIpn(any());
    }

    private PaymentComplaint overpaid() {
        PaymentComplaint c = open(ORDER);
        c.setAmount(new BigDecimal("20000"));
        return c;
    }

    @Test
    @DisplayName("Chuyển thừa 20.000 cho đơn 15.000: ghi đơn đúng 15.000 qua luồng webhook, trả lại 5.000")
    void resolve_orderReturnExcess_recordsOrderAmount() {
        PaymentComplaint c = overpaid();
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(sepayLogRepository.findFirstByReferenceCodeAndAuthOkTrueAndTransferAmountNotNullOrderByReceivedAtAsc("FT123"))
                .thenReturn(Optional.of(SepayWebhookLog.builder().referenceCode("FT123")
                        .transferAmount(new BigDecimal("20000")).resultStatus("AMOUNT_MISMATCH").build()));
        when(transactionRepository.findByGatewayTransactionId(ORDER)).thenReturn(Optional.of(order(6L, TransactionStatus.PENDING)));
        when(paymentProcessingService.processSepayIpn(argThat(ipn -> ORDER.equals(ipn.resolveOrderCode())
                && "FT123".equals(ipn.getReferenceCode())
                && new BigDecimal("15000").compareTo(ipn.resolveAmount()) == 0)))
                .thenReturn(Map.of("status", "SUCCESS"));
        when(complaintRepository.save(c)).thenReturn(c);

        service.resolve(9L, 2L, PaymentComplaintService.Target.ORDER_RETURN_EXCESS, "Đã trả phần thừa, mã GD FT777");

        assertEquals(PaymentComplaint.Status.RESOLVED, c.getStatus());
        assertEquals(PaymentComplaintService.EXCESS_RETURNED, c.getResolution());
        assertEquals(0, new BigDecimal("5000").compareTo(c.getReturnedAmount()));
    }

    @Test
    @DisplayName("Ghi đơn + trả phần thừa: chuyển đủ / chuyển thiếu / thiếu mã GD trả -> từ chối, không ghi gì")
    void resolve_orderReturnExcess_rejectsWhenNotOverpaid() {
        PaymentComplaint exact = open(ORDER);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(exact));
        AppException noRef = assertThrows(AppException.class,
                () -> service.resolve(9L, 2L, PaymentComplaintService.Target.ORDER_RETURN_EXCESS, " "));
        assertEquals(HttpStatus.BAD_REQUEST, noRef.getStatus());

        when(transactionRepository.findByGatewayTransactionId(ORDER)).thenReturn(Optional.of(order(6L, TransactionStatus.PENDING)));
        AppException equal = assertThrows(AppException.class,
                () -> service.resolve(9L, 2L, PaymentComplaintService.Target.ORDER_RETURN_EXCESS, "FT777"));
        assertEquals(HttpStatus.CONFLICT, equal.getStatus());

        exact.setAmount(new BigDecimal("10000"));
        AppException under = assertThrows(AppException.class,
                () -> service.resolve(9L, 2L, PaymentComplaintService.Target.ORDER_RETURN_EXCESS, "FT777"));
        assertEquals(HttpStatus.CONFLICT, under.getStatus());

        assertEquals(PaymentComplaint.Status.OPEN, exact.getStatus());
        verify(paymentProcessingService, never()).processSepayIpn(any());
    }

    @Test
    @DisplayName("Ghi đơn + trả phần thừa nhưng đơn đã hết hạn -> 409, gợi ý trả lại toàn bộ")
    void resolve_orderReturnExcess_lateOrder() {
        PaymentComplaint c = overpaid();
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(transactionRepository.findByGatewayTransactionId(ORDER)).thenReturn(Optional.of(order(6L, TransactionStatus.PENDING)));
        when(paymentProcessingService.processSepayIpn(any()))
                .thenReturn(Map.of("status", "LATE_PAYMENT", "message", "Tiền về sau khi đơn hết hiệu lực"));

        AppException ex = assertThrows(AppException.class,
                () -> service.resolve(9L, 2L, PaymentComplaintService.Target.ORDER_RETURN_EXCESS, "FT777"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("toàn bộ"));
        assertEquals(PaymentComplaint.Status.OPEN, c.getStatus());
    }

    @Test
    @DisplayName("Chuyển trả toàn bộ: lưu số tiền đã trả bằng số khách chuyển")
    void resolve_returned_storesReturnedAmount() {
        PaymentComplaint c = open(null);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(complaintRepository.save(c)).thenReturn(c);

        service.resolve(9L, 2L, PaymentComplaintService.Target.RETURNED, "Đã chuyển trả, mã GD FT999");

        assertEquals(0, new BigDecimal("15000").compareTo(c.getReturnedAmount()));
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

    @Test
    @DisplayName("Rule 5: mã GD đã được webhook ghi tiền -> 409, không ghi nhận lần 2 (cả ghi đơn lẫn trả lại)")
    void resolve_referenceAlreadyRecordedByWebhook() {
        PaymentComplaint c = open(ORDER);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(sepayLogRepository.findFirstByReferenceCodeAndResultStatusInOrderByReceivedAtAsc(
                eq("FT123"), eq(SepayWebhookLog.MONEY_RECORDED_STATUSES)))
                .thenReturn(Optional.of(SepayWebhookLog.builder().referenceCode("FT123")
                        .resultStatus("SUCCESS").orderCode(ORDER).build()));

        for (PaymentComplaintService.Target target : PaymentComplaintService.Target.values()) {
            AppException ex = assertThrows(AppException.class, () -> service.resolve(9L, 2L, target, null));
            assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        }
        assertEquals(PaymentComplaint.Status.OPEN, c.getStatus());
        verify(paymentProcessingService, never()).processSepayIpn(any());
    }

    @Test
    @DisplayName("Rule 5: mã GD đã được gán khi đối soát kỳ -> 409, không ghi nhận lần 2")
    void resolve_referenceAlreadyRecordedByReconciliation() {
        PaymentComplaint c = open(null);
        when(complaintRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(c));
        when(reconciliationItemRepository.existsByReferenceCodeAndStatusAndActionIn(eq("FT123"), any(), any())).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> service.resolve(9L, 2L, null, "Đã trả FT999"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(PaymentComplaint.Status.OPEN, c.getStatus());
    }
}
