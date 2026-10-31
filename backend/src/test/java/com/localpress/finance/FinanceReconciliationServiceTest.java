package com.localpress.finance;

import com.localpress.finance.dto.request.ResolveDiscrepancyRequest;
import com.localpress.finance.model.ReconciliationItem;
import com.localpress.finance.model.ReconciliationPeriod;
import com.localpress.finance.model.SepayWebhookLog;
import com.localpress.finance.repository.PaymentComplaintRepository;
import com.localpress.finance.repository.ReconciliationItemRepository;
import com.localpress.finance.repository.ReconciliationPeriodRepository;
import com.localpress.finance.repository.SepayWebhookLogRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.FinanceReconciliationService;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.shared.exception.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TEST: ĐỐI SOÁT KỲ (SV4 - UC054)
 */
@ExtendWith(MockitoExtension.class)
class FinanceReconciliationServiceTest {

    private static final String ORDER = "LP2610201200ABCD";
    private static final String MONTH = YearMonth.now().toString();

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private ReconciliationPeriodRepository periodRepository;
    @Mock private ReconciliationItemRepository itemRepository;
    @Mock private SepayWebhookLogRepository sepayLogRepository;
    @Mock private PaymentComplaintRepository complaintRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private PaymentProcessingService paymentProcessingService;
    @InjectMocks private FinanceReconciliationService service;

    private ReconciliationPeriod period(ReconciliationPeriod.Status status) {
        return ReconciliationPeriod.builder().periodId(1L).periodMonth(MONTH).status(status).build();
    }

    private ReconciliationItem bankItem(String amount) {
        return ReconciliationItem.builder().itemId(5L).periodId(1L).itemType(ReconciliationItem.Type.BANK_NOT_RECORDED)
                .logId(70L).referenceCode("FT777").orderCode(null).amount(new BigDecimal(amount))
                .reason("Nội dung chuyển khoản không có mã đơn").build();
    }

    private void stubItem(ReconciliationItem item, ReconciliationPeriod period) {
        when(itemRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(item));
        when(periodRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(period));
    }

    private ResolveDiscrepancyRequest request(String action, String orderCode) {
        return ResolveDiscrepancyRequest.builder().discrepancyId("5").action(action).orderCode(orderCode)
                .note("Khớp sao kê VCB ngày 20/10").build();
    }

    @Test
    @DisplayName("Gán vào đơn: chạy đúng luồng webhook với mã GD và số tiền của khoản lệch, rồi RESOLVED")
    void assignOrder_runsWebhookFlow() {
        ReconciliationItem item = bankItem("15000");
        stubItem(item, period(ReconciliationPeriod.Status.OPEN));
        when(paymentProcessingService.resolvePaymentCode(ORDER, new BigDecimal("15000"))).thenReturn(ORDER);
        when(paymentProcessingService.processSepayIpn(argThat(ipn -> ORDER.equals(ipn.resolveOrderCode())
                && "FT777".equals(ipn.getReferenceCode()) && new BigDecimal("15000").compareTo(ipn.resolveAmount()) == 0)))
                .thenReturn(Map.of("status", "SUCCESS"));

        service.resolveDiscrepancy(request("ASSIGN_ORDER", ORDER.toLowerCase()), 3L);

        assertEquals(ReconciliationItem.Status.RESOLVED, item.getStatus());
        assertEquals(ReconciliationItem.Action.ASSIGN_ORDER, item.getAction());
        assertEquals("SUCCESS", item.getActionResult());
        assertEquals(3L, item.getResolvedBy());
        verify(itemRepository).save(item);
    }

    @Test
    @DisplayName("Rule 5: mã GD đã được webhook ghi tiền -> 409, không chạy lại luồng tiền")
    void assignOrder_referenceAlreadyRecorded() {
        ReconciliationItem item = bankItem("15000");
        stubItem(item, period(ReconciliationPeriod.Status.OPEN));
        when(sepayLogRepository.findFirstByReferenceCodeAndResultStatusInOrderByReceivedAtAsc(eq("FT777"), any()))
                .thenReturn(Optional.of(SepayWebhookLog.builder().resultStatus("SUCCESS").build()));

        AppException ex = assertThrows(AppException.class,
                () -> service.resolveDiscrepancy(request("ASSIGN_ORDER", ORDER), 3L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(ReconciliationItem.Status.UNRESOLVED, item.getStatus());
        verify(paymentProcessingService, never()).processSepayIpn(any());
    }

    @Test
    @DisplayName("Gán vào đơn đã thanh toán -> 409, gợi ý cộng ví; khoản lệch vẫn mở")
    void assignOrder_alreadyPaid() {
        ReconciliationItem item = bankItem("15000");
        stubItem(item, period(ReconciliationPeriod.Status.OPEN));
        when(paymentProcessingService.resolvePaymentCode(any(), any())).thenReturn(ORDER);
        when(paymentProcessingService.processSepayIpn(any())).thenReturn(Map.of("status", "ALREADY_PROCESSED"));

        AppException ex = assertThrows(AppException.class,
                () -> service.resolveDiscrepancy(request("ASSIGN_ORDER", ORDER), 3L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(ReconciliationItem.Status.UNRESOLVED, item.getStatus());
    }

    @Test
    @DisplayName("SePay không báo số tiền: cộng ví bắt buộc nhập số tiền theo sao kê (400)")
    void creditWallet_missingAmountNeedsStatementAmount() {
        ReconciliationItem item = bankItem("0");
        stubItem(item, period(ReconciliationPeriod.Status.OPEN));
        ResolveDiscrepancyRequest req = request("CREDIT_WALLET", null);
        req.setUserId(6L);

        AppException ex = assertThrows(AppException.class, () -> service.resolveDiscrepancy(req, 3L));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(paymentProcessingService, never()).creditUnmatchedTransfer(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Cộng ví: dùng mã REC-{mã GD}, số tiền nhập theo sao kê được lưu lại vào khoản lệch")
    void creditWallet_usesRecCode() {
        ReconciliationItem item = bankItem("0");
        stubItem(item, period(ReconciliationPeriod.Status.OPEN));
        when(jdbcTemplate.queryForObject(startsWith("SELECT COUNT(*) FROM users"), eq(Integer.class), eq(6L))).thenReturn(1);
        when(paymentProcessingService.creditUnmatchedTransfer(eq(6L), eq(new BigDecimal("20000")), eq("REC-FT777"), anyString()))
                .thenReturn(Map.of("status", "CREDITED_WALLET"));
        ResolveDiscrepancyRequest req = request("CREDIT_WALLET", null);
        req.setUserId(6L);
        req.setAmount(new BigDecimal("20000"));

        service.resolveDiscrepancy(req, 3L);

        assertEquals("CREDITED_WALLET", item.getActionResult());
        assertEquals(0, new BigDecimal("20000").compareTo(item.getAmount()));
    }

    @Test
    @DisplayName("Khoản ghi theo khiếu nại chỉ được giải trình, không gán đơn / cộng ví lần nữa (400)")
    void recordedWithoutBank_onlyExplain() {
        ReconciliationItem item = bankItem("15000");
        item.setItemType(ReconciliationItem.Type.RECORDED_WITHOUT_BANK);
        stubItem(item, period(ReconciliationPeriod.Status.OPEN));

        AppException ex = assertThrows(AppException.class,
                () -> service.resolveDiscrepancy(request("CREDIT_WALLET", ORDER), 3L));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Kỳ đã chốt -> 409, không xử lý thêm")
    void closedPeriod_locked() {
        ReconciliationItem item = bankItem("15000");
        stubItem(item, period(ReconciliationPeriod.Status.CLOSED));

        AppException ex = assertThrows(AppException.class,
                () -> service.resolveDiscrepancy(request("EXPLAINED", null), 3L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(itemRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chốt kỳ khi còn khoản lệch mà chưa xác nhận -> 409; xác nhận thì CLOSED kèm ảnh chụp số liệu")
    void closePeriod_requiresAcknowledgement() {
        ReconciliationPeriod open = period(ReconciliationPeriod.Status.OPEN);
        when(periodRepository.findByPeriodMonth(MONTH)).thenReturn(Optional.of(open));
        when(periodRepository.findByPeriodMonthForUpdate(MONTH)).thenReturn(Optional.of(open));
        when(itemRepository.findByPeriodIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(bankItem("15000")));

        AppException ex = assertThrows(AppException.class, () -> service.closePeriod(MONTH, 2L, false, null));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(ReconciliationPeriod.Status.OPEN, open.getStatus());

        service.closePeriod(MONTH, 2L, true, "Chốt cuối tháng");

        assertEquals(ReconciliationPeriod.Status.CLOSED, open.getStatus());
        assertEquals(2L, open.getClosedBy());
        assertEquals(1, open.getUnresolvedCount());
        verify(periodRepository).save(open);
    }

    @Test
    @DisplayName("Tháng tương lai hoặc sai định dạng -> 400")
    void invalidMonth() {
        String future = YearMonth.now().plusMonths(1).toString();
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AppException.class, () -> service.getPeriod(future)).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AppException.class, () -> service.getPeriod("10/2026")).getStatus());
    }
}
