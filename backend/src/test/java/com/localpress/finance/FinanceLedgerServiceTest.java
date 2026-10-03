package com.localpress.finance;

import com.localpress.finance.dto.request.LedgerFilterRequest;
import com.localpress.finance.dto.response.LedgerSummaryResponse;
import com.localpress.finance.dto.response.TransactionDetailResponse;
import com.localpress.finance.dto.response.TransactionLedgerResponse;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.FinanceLedgerService;
import com.localpress.shared.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * ==============================================================================
 * UNIT TESTS: QUẢN LÝ SỔ QUỸ & CHỨNG TỪ TÀI CHÍNH (UC047, UC048, UC049)
 * ==============================================================================
 */
@ExtendWith(MockitoExtension.class)
class FinanceLedgerServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private FinanceLedgerService financeLedgerService;

    private Transaction sampleTx;

    @BeforeEach
    void setUp() {
        sampleTx = Transaction.builder()
                .transactionId(1L)
                .userId(101L)
                .campaignId(202L)
                .transactionType(TransactionType.AD)
                .amount(new BigDecimal("5000000.00"))
                .currency("VND")
                .paymentMethod("BANK_TRANSFER")
                .gatewayTransactionId("MB-998811")
                .bankCode("MB")
                .status(TransactionStatus.SUCCESS)
                .paidAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();
    }

    @Nested
    @DisplayName("UC047: Tra cứu sổ quỹ tài chính")
    class SearchLedgerTests {

        @Test
        @DisplayName("Lọc danh sách sổ quỹ thành công với các tiêu chí")
        void shouldReturnPagedLedgerEntries() {
            Page<Transaction> page = new PageImpl<>(List.of(sampleTx));
            when(transactionRepository.searchLedger(
                    eq(TransactionStatus.SUCCESS),
                    eq(TransactionType.AD),
                    eq("BANK_TRANSFER"),
                    any(),
                    any(),
                    eq("MB-998811"),
                    any(Pageable.class)
            )).thenReturn(page);

            LedgerFilterRequest filter = LedgerFilterRequest.builder()
                    .status(TransactionStatus.SUCCESS)
                    .transactionType(TransactionType.AD)
                    .paymentMethod("BANK_TRANSFER")
                    .keyword("MB-998811")
                    .page(0)
                    .size(10)
                    .build();

            Page<TransactionLedgerResponse> result = financeLedgerService.getLedgerEntries(filter);

            assertThat(result.getTotalElements()).isEqualTo(1);
            TransactionLedgerResponse row = result.getContent().get(0);
            assertThat(row.getTransactionId()).isEqualTo(1L);
            assertThat(row.getAmount()).isEqualByComparingTo("5000000.00");
            assertThat(row.getTargetId()).isEqualTo(202L);
        }
    }

    @Nested
    @DisplayName("UC048: Xem chi tiết chứng từ")
    class TransactionDetailTests {

        @Test
        @DisplayName("Lấy chi tiết thành công khi ID tồn tại")
        void shouldReturnTransactionDetailWhenFound() {
            when(transactionRepository.findById(1L)).thenReturn(Optional.of(sampleTx));

            TransactionDetailResponse detail = financeLedgerService.getTransactionDetail(1L);

            assertThat(detail.getTransactionId()).isEqualTo(1L);
            assertThat(detail.getCampaignId()).isEqualTo(202L);
            assertThat(detail.getTransactionType()).isEqualTo(TransactionType.AD);
        }

        @Test
        @DisplayName("Báo lỗi NOT_FOUND khi không tìm thấy mã giao dịch")
        void shouldThrowNotFoundWhenIdNotExists() {
            when(transactionRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> financeLedgerService.getTransactionDetail(999L))
                    .isInstanceOf(AppException.class)
                    .hasMessageContaining("Không tìm thấy chứng từ giao dịch #999");
        }
    }

    @Nested
    @DisplayName("UC049: Tổng hợp số liệu sổ quỹ")
    class LedgerSummaryTests {

        @Test
        @DisplayName("Tính toán chính xác tổng thu, hoàn tiền, doanh thu thuần và số lượng đơn")
        void shouldCalculateSummaryAccurately() {
            when(transactionRepository.calculateTotalGrossRevenue()).thenReturn(new BigDecimal("10000000.00"));
            when(transactionRepository.calculateTotalRefundedAmount()).thenReturn(new BigDecimal("1000000.00"));
            when(transactionRepository.countByStatus(TransactionStatus.PENDING)).thenReturn(5L);
            when(transactionRepository.countByStatus(TransactionStatus.SUCCESS)).thenReturn(20L);
            when(transactionRepository.countByStatus(TransactionStatus.FAILED)).thenReturn(2L);
            when(transactionRepository.countByStatusAndPaymentMethodIn(eq(TransactionStatus.PENDING), anyCollection()))
                    .thenReturn(3L);

            LedgerSummaryResponse summary = financeLedgerService.getLedgerSummary();

            assertThat(summary.getTotalGrossRevenue()).isEqualByComparingTo("10000000.00");
            assertThat(summary.getTotalRefundedAmount()).isEqualByComparingTo("1000000.00");
            assertThat(summary.getNetRevenue()).isEqualByComparingTo("9000000.00");
            assertThat(summary.getPendingCount()).isEqualTo(5L);
            assertThat(summary.getSuccessCount()).isEqualTo(20L);
            assertThat(summary.getFailedCount()).isEqualTo(2L);
            assertThat(summary.getPendingManualTransfersCount()).isEqualTo(3L);
        }
    }
}
