package com.localpress.finance;

import com.localpress.finance.dto.request.ManualTransferConfirmRequest;
import com.localpress.finance.dto.request.ManualTransferRejectRequest;
import com.localpress.finance.dto.response.TransactionDetailResponse;
import com.localpress.finance.dto.response.TransactionLedgerResponse;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.ManualBankTransferService;
import com.localpress.shared.event.PaymentSuccessEvent;
import com.localpress.shared.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * ==============================================================================
 * UNIT TESTS: DỊCH VỤ DUYỆT CHUYỂN KHOẢN NGÂN HÀNG THỦ CÔNG (UC050, UC051)
 * ==============================================================================
 * Kiểm thử toàn diện các tình huống nghiệp vụ:
 * 1. Lấy danh sách hàng đợi chuyển khoản chờ duyệt.
 * 2. Kế toán xác nhận thành công -> Trạng thái đổi sang SUCCESS -> Bắn PaymentSuccessEvent.
 * 3. Chống trùng mã bút toán ngân hàng (Idempotency).
 * 4. Chặn thao tác khi giao dịch không ở trạng thái PENDING.
 * 5. Kế toán từ chối đơn chuyển khoản -> Trạng thái đổi sang FAILED.
 */
@ExtendWith(MockitoExtension.class)
class ManualBankTransferServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ManualBankTransferService manualBankTransferService;

    private Transaction pendingSubscriptionTx;
    private final Long accountantId = 4L;

    @BeforeEach
    void setUp() {
        pendingSubscriptionTx = Transaction.builder()
                .transactionId(100L)
                .userId(10L)
                .subscriptionId(50L)
                .transactionType(TransactionType.SUBSCRIPTION)
                .amount(new BigDecimal("150000.00"))
                .currency("VND")
                .paymentMethod("MANUAL_BANK_TRANSFER")
                .status(TransactionStatus.PENDING)
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();
    }

    @Nested
    @DisplayName("UC050: Hàng đợi chuyển khoản chờ duyệt")
    class PendingQueueTests {

        @Test
        @DisplayName("Lấy danh sách hàng đợi thành công khi có giao dịch PENDING")
        void shouldReturnPendingQueue() {
            Page<Transaction> page = new PageImpl<>(List.of(pendingSubscriptionTx));
            when(transactionRepository.findByStatusAndPaymentMethodIn(
                    eq(TransactionStatus.PENDING), anyCollection(), any(Pageable.class)
            )).thenReturn(page);

            Page<TransactionLedgerResponse> result = manualBankTransferService.getPendingQueue(0, 10);

            assertThat(result.getTotalElements()).isEqualTo(1);
            assertThat(result.getContent().get(0).getTransactionId()).isEqualTo(100L);
            assertThat(result.getContent().get(0).getStatus()).isEqualTo(TransactionStatus.PENDING);
        }
    }

    @Nested
    @DisplayName("UC051: Kế toán xác nhận chuyển khoản (Confirm Transfer)")
    class ConfirmTransferTests {

        @Test
        @DisplayName("Xác nhận thành công: Cập nhật trạng thái SUCCESS và bắn Domain Event")
        void shouldConfirmTransferAndPublishEvent() {
            ManualTransferConfirmRequest request = ManualTransferConfirmRequest.builder()
                    .bankReferenceCode("VCB-FT-998877")
                    .bankCode("VCB")
                    .note("Tiền đã vào tài khoản VCB tòa soạn")
                    .build();

            when(transactionRepository.findById(100L)).thenReturn(Optional.of(pendingSubscriptionTx));
            when(transactionRepository.findByGatewayTransactionId("VCB-FT-998877")).thenReturn(Optional.empty());
            when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

            TransactionDetailResponse response = manualBankTransferService.confirmTransfer(100L, accountantId, request);

            // 1. Kiểm tra trạng thái đã cập nhật
            assertThat(response.getStatus()).isEqualTo(TransactionStatus.SUCCESS);
            assertThat(response.getGatewayTransactionId()).isEqualTo("VCB-FT-998877");
            assertThat(response.getBankCode()).isEqualTo("VCB");
            assertThat(response.getReconciledBy()).isEqualTo(accountantId);
            assertThat(response.getPaidAt()).isNotNull();

            // 2. Kiểm tra đã bắn PaymentSuccessEvent qua Event Publisher
            ArgumentCaptor<PaymentSuccessEvent> eventCaptor = ArgumentCaptor.forClass(PaymentSuccessEvent.class);
            verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());

            PaymentSuccessEvent publishedEvent = eventCaptor.getValue();
            assertThat(publishedEvent.getTransactionId()).isEqualTo(100L);
            assertThat(publishedEvent.getUserId()).isEqualTo(10L);
            assertThat(publishedEvent.getTargetId()).isEqualTo(50L);
            assertThat(publishedEvent.getTransactionType()).isEqualTo("SUBSCRIPTION");
            assertThat(publishedEvent.getAmount()).isEqualByComparingTo("150000.00");
        }

        @Test
        @DisplayName("Báo lỗi xung đột khi mã bút toán ngân hàng đã được gán cho giao dịch khác (Idempotency)")
        void shouldThrowConflictWhenGatewayIdAlreadyUsed() {
            ManualTransferConfirmRequest request = ManualTransferConfirmRequest.builder()
                    .bankReferenceCode("VCB-FT-DUPLICATE")
                    .build();

            Transaction existingTx = Transaction.builder()
                    .transactionId(999L)
                    .gatewayTransactionId("VCB-FT-DUPLICATE")
                    .build();

            when(transactionRepository.findById(100L)).thenReturn(Optional.of(pendingSubscriptionTx));
            when(transactionRepository.findByGatewayTransactionId("VCB-FT-DUPLICATE")).thenReturn(Optional.of(existingTx));

            assertThatThrownBy(() -> manualBankTransferService.confirmTransfer(100L, accountantId, request))
                    .isInstanceOf(AppException.class)
                    .hasMessageContaining("đã được sử dụng cho giao dịch #999");

            verify(eventPublisher, never()).publishEvent(any());
        }

        @Test
        @DisplayName("Báo lỗi khi giao dịch đã ở trạng thái SUCCESS trước đó")
        void shouldThrowConflictWhenTransactionNotPending() {
            pendingSubscriptionTx.setStatus(TransactionStatus.SUCCESS);
            when(transactionRepository.findById(100L)).thenReturn(Optional.of(pendingSubscriptionTx));

            ManualTransferConfirmRequest request = ManualTransferConfirmRequest.builder().build();

            assertThatThrownBy(() -> manualBankTransferService.confirmTransfer(100L, accountantId, request))
                    .isInstanceOf(AppException.class)
                    .hasMessageContaining("không ở trạng thái chờ duyệt");

            verify(eventPublisher, never()).publishEvent(any());
        }
    }

    @Nested
    @DisplayName("UC051: Kế toán từ chối đơn chuyển khoản (Reject Transfer)")
    class RejectTransferTests {

        @Test
        @DisplayName("Từ chối thành công: Cập nhật trạng thái FAILED và ghi nhận người từ chối")
        void shouldRejectTransferSuccessfully() {
            ManualTransferRejectRequest request = ManualTransferRejectRequest.builder()
                    .rejectionReason("Không tìm thấy bút toán tiền vào sau 24h")
                    .build();

            when(transactionRepository.findById(100L)).thenReturn(Optional.of(pendingSubscriptionTx));
            when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

            TransactionDetailResponse response = manualBankTransferService.rejectTransfer(100L, accountantId, request);

            assertThat(response.getStatus()).isEqualTo(TransactionStatus.FAILED);
            assertThat(response.getReconciledBy()).isEqualTo(accountantId);
            verify(eventPublisher, never()).publishEvent(any());
        }
    }
}
