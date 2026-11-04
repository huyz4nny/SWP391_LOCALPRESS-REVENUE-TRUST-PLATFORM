package com.localpress.finance;

import com.localpress.finance.dto.response.FinancialDocumentResponse;
import com.localpress.finance.model.FinancialDocument;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.FinancialDocumentRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.FinancialDocumentService;
import com.localpress.shared.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * UC057: hệ thống tự phát hành chứng từ khi đơn SUCCESS, hủy khi hoàn toàn phần.
 * VAT 8% (NQ 204/2025/QH15), giá đơn đã gồm VAT.
 */
@ExtendWith(MockitoExtension.class)
class FinancialDocumentServiceTest {

    private static final LocalDateTime PAID_AT = LocalDateTime.of(2026, 11, 3, 10, 15);

    @Mock private FinancialDocumentRepository documentRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private JdbcTemplate jdbcTemplate;
    @InjectMocks private FinancialDocumentService service;

    @BeforeEach
    void echoSave() {
        lenient().when(documentRepository.save(any(FinancialDocument.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Transaction paid(long id, TransactionType type, String amount) {
        Transaction.TransactionBuilder b = Transaction.builder()
                .transactionId(id).userId(5L).transactionType(type)
                .amount(new BigDecimal(amount)).currency("VND").paymentMethod("SEPAY")
                .gatewayTransactionId("LP26110310150" + id).description("Đơn " + id)
                .status(TransactionStatus.SUCCESS).paidAt(PAID_AT);
        switch (type) {
            case AD -> b.campaignId(3L);
            case ARTICLE -> b.purchaseId(4L);
            case SUBSCRIPTION -> b.subscriptionId(6L);
            default -> { }
        }
        return b.build();
    }

    @SuppressWarnings("unchecked")
    private void stubBuyer(String name, String taxCode, String address) {
        when(jdbcTemplate.query(contains("FROM advertisers"), any(RowMapper.class), eq(5L)))
                .thenAnswer(inv -> {
                    RowMapper<Object> mapper = inv.getArgument(1);
                    java.sql.ResultSet rs = mock(java.sql.ResultSet.class);
                    when(rs.getString("name")).thenReturn(name);
                    when(rs.getString("tax_code")).thenReturn(taxCode);
                    when(rs.getString("address")).thenReturn(address);
                    return List.of(mapper.mapRow(rs, 0));
                });
    }

    @SuppressWarnings("unchecked")
    private void stubReaderName(String name) {
        when(jdbcTemplate.query(contains("FROM users"), any(RowMapper.class), eq(5L)))
                .thenReturn((List) List.of(name));
    }

    @Test
    @DisplayName("Đơn quảng cáo -> hóa đơn HD-2026-nnnnnn, thông tin xuất hóa đơn, VAT 8% tách từ giá đã gồm thuế")
    void issue_adOrder_invoiceWithVat() {
        when(documentRepository.findByTransactionId(11L)).thenReturn(Optional.empty());
        when(documentRepository.currentSequence("INVOICE", 2026)).thenReturn(7);
        stubBuyer("Công ty Cảng Hải Phòng", "0201988888", "8A Trần Phú, Hải Phòng");

        FinancialDocument doc = service.issueFor(paid(11L, TransactionType.AD, "45000000"));

        verify(documentRepository).bumpSequence("INVOICE", 2026);
        assertEquals("HD-2026-000007", doc.getDocumentNo());
        assertEquals(FinancialDocument.Type.INVOICE, doc.getDocumentType());
        assertEquals("Công ty Cảng Hải Phòng", doc.getBuyerName());
        assertEquals("0201988888", doc.getBuyerTaxCode());
        assertEquals(0, doc.getVatRate().compareTo(BigDecimal.valueOf(8)));
        // 45.000.000 / 1,08 = 41.666.666,67 -> 41.666.667 đ, thuế 3.333.333 đ
        assertEquals(0, doc.getAmountBeforeVat().compareTo(new BigDecimal("41666667")));
        assertEquals(0, doc.getVatAmount().compareTo(new BigDecimal("3333333")));
        assertEquals(0, doc.getAmountBeforeVat().add(doc.getVatAmount()).compareTo(doc.getTotalAmount()));
        assertEquals(FinancialDocument.Status.ISSUED, doc.getStatus());
        assertEquals(PAID_AT, doc.getIssuedAt());
    }

    @Test
    @DisplayName("Đơn bài lẻ / gói -> biên nhận BN-, dãy số riêng, người mua là tên tài khoản")
    void issue_readerOrder_receipt() {
        when(documentRepository.findByTransactionId(12L)).thenReturn(Optional.empty());
        when(documentRepository.currentSequence("RECEIPT", 2026)).thenReturn(1);
        stubReaderName("Nguyễn Văn An");

        FinancialDocument doc = service.issueFor(paid(12L, TransactionType.ARTICLE, "15000"));

        verify(documentRepository).bumpSequence("RECEIPT", 2026);
        verify(documentRepository, never()).bumpSequence(eq("INVOICE"), anyInt());
        assertEquals("BN-2026-000001", doc.getDocumentNo());
        assertEquals("Nguyễn Văn An", doc.getBuyerName());
        assertNull(doc.getBuyerTaxCode());
        // 15.000 / 1,08 = 13.888,89 -> 13.889 đ, thuế 1.111 đ
        assertEquals(0, doc.getAmountBeforeVat().compareTo(new BigDecimal("13889")));
        assertEquals(0, doc.getVatAmount().compareTo(new BigDecimal("1111")));
    }

    @Test
    @DisplayName("Rule 5: đơn đã có chứng từ (webhook lặp, đối soát chạy lại) -> trả chứng từ cũ, không cấp số mới")
    void issue_isIdempotent() {
        FinancialDocument existing = FinancialDocument.builder().documentNo("BN-2026-000003").transactionId(13L).build();
        when(documentRepository.findByTransactionId(13L)).thenReturn(Optional.of(existing));

        FinancialDocument doc = service.issueFor(paid(13L, TransactionType.SUBSCRIPTION, "99000"));

        assertSame(existing, doc);
        verify(documentRepository, never()).bumpSequence(anyString(), anyInt());
        verify(documentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Doanh nghiệp chưa có hồ sơ: vẫn phát hành với tên tài khoản (không chặn ghi tiền)")
    @SuppressWarnings("unchecked")
    void issue_adWithoutProfile_fallsBackToUserName() {
        when(documentRepository.findByTransactionId(14L)).thenReturn(Optional.empty());
        when(documentRepository.currentSequence("INVOICE", 2026)).thenReturn(2);
        when(jdbcTemplate.query(contains("FROM advertisers"), any(RowMapper.class), eq(5L))).thenReturn(List.of());
        stubReaderName("Trần Thị B");

        FinancialDocument doc = service.issueFor(paid(14L, TransactionType.AD, "300000"));

        assertEquals("HD-2026-000002", doc.getDocumentNo());
        assertEquals("Trần Thị B", doc.getBuyerName());
    }

    @Test
    @DisplayName("Không phát hành chứng từ cho bút toán REFUND")
    void issue_refundRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> service.issueFor(paid(15L, TransactionType.REFUND, "15000")));
        verifyNoInteractions(documentRepository);
    }

    @Test
    @DisplayName("Hoàn toàn phần -> VOIDED + voided_at; gọi lại không đổi; đơn không có chứng từ thì bỏ qua")
    void void_fullRefund() {
        FinancialDocument doc = FinancialDocument.builder().documentNo("BN-2026-000004").transactionId(16L)
                .status(FinancialDocument.Status.ISSUED).build();
        when(documentRepository.findByTransactionId(16L)).thenReturn(Optional.of(doc));
        LocalDateTime when = LocalDateTime.of(2026, 11, 20, 9, 0);

        service.voidFor(16L, when);
        service.voidFor(16L, when.plusDays(1));

        assertEquals(FinancialDocument.Status.VOIDED, doc.getStatus());
        assertEquals(when, doc.getVoidedAt());
        verify(documentRepository, times(1)).save(doc);

        when(documentRepository.findByTransactionId(17L)).thenReturn(Optional.empty());
        assertDoesNotThrow(() -> service.voidFor(17L, when));
    }

    @Test
    @DisplayName("Rule 14: xem chứng từ của đơn người khác -> 403; đơn chưa thu -> 404")
    void getForTransaction_access() {
        Transaction tx = paid(18L, TransactionType.ARTICLE, "15000");
        when(transactionRepository.findById(18L)).thenReturn(Optional.of(tx));

        AppException forbidden = assertThrows(AppException.class,
                () -> service.getForTransaction(new FinanceCurrentUser.Principal(9L, "READER"), 18L));
        assertEquals(HttpStatus.FORBIDDEN, forbidden.getStatus());

        when(documentRepository.findByTransactionId(18L)).thenReturn(Optional.empty());
        AppException notFound = assertThrows(AppException.class,
                () -> service.getForTransaction(new FinanceCurrentUser.Principal(1L, "ACCOUNTANT"), 18L));
        assertEquals(HttpStatus.NOT_FOUND, notFound.getStatus());
    }

    @Test
    @DisplayName("Chứng từ của tôi: trả kèm mã đơn, loại đơn theo frontend, lọc theo loại")
    void getMine_mapsOrder() {
        FinancialDocument doc = FinancialDocument.builder().documentNo("HD-2026-000001")
                .documentType(FinancialDocument.Type.INVOICE).transactionId(19L).userId(5L)
                .buyerName("Cty A").vatRate(BigDecimal.valueOf(8)).amountBeforeVat(new BigDecimal("277778"))
                .vatAmount(new BigDecimal("22222")).totalAmount(new BigDecimal("300000"))
                .status(FinancialDocument.Status.ISSUED).issuedAt(PAID_AT).build();
        when(documentRepository.findByUserIdAndDocumentTypeOrderByIssuedAtDescDocumentIdDesc(5L, FinancialDocument.Type.INVOICE))
                .thenReturn(List.of(doc));
        when(transactionRepository.findAllById(List.of(19L))).thenReturn(List.of(paid(19L, TransactionType.AD, "300000")));

        List<FinancialDocumentResponse> res = service.getMine(5L, "invoice");

        assertEquals(1, res.size());
        assertEquals("LP2611031015019", res.get(0).getOrderCode());
        assertEquals("AD_CAMPAIGN", res.get(0).getTargetType());
        assertEquals("3", res.get(0).getTargetId());

        AppException bad = assertThrows(AppException.class, () -> service.getMine(5L, "BILL"));
        assertEquals(HttpStatus.BAD_REQUEST, bad.getStatus());
    }

    @Test
    @DisplayName("Số tiền tròn: tổng = trước thuế + thuế với mọi mức giá thường gặp")
    void split_alwaysSumsToTotal() {
        when(documentRepository.findByTransactionId(anyLong())).thenReturn(Optional.empty());
        when(documentRepository.currentSequence(anyString(), anyInt())).thenReturn(1);
        stubReaderName("A");
        ArgumentCaptor<FinancialDocument> saved = ArgumentCaptor.forClass(FinancialDocument.class);

        long id = 100;
        for (String amount : List.of("1000", "5000", "15000", "49000", "99000", "199000", "1234567")) {
            service.issueFor(paid(id++, TransactionType.SUBSCRIPTION, amount));
        }

        verify(documentRepository, atLeastOnce()).save(saved.capture());
        for (FinancialDocument d : saved.getAllValues()) {
            assertEquals(0, d.getAmountBeforeVat().add(d.getVatAmount()).compareTo(d.getTotalAmount()), d.getTotalAmount().toPlainString());
            assertEquals(0, d.getAmountBeforeVat().remainder(BigDecimal.ONE).signum(), "làm tròn đến đồng");
        }
    }
}
