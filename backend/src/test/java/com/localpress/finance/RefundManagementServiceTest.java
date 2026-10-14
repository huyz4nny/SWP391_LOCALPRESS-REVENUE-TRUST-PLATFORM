package com.localpress.finance;

import com.localpress.finance.dto.request.ProposeRefundRequest;
import com.localpress.finance.dto.request.ReviewRefundRequest;
import com.localpress.finance.dto.response.RefundDetailResponse;
import com.localpress.finance.model.RefundRequest;
import com.localpress.finance.model.RefundStatus;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.RefundRequestRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.RefundManagementService;
import com.localpress.shared.exception.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * ==============================================================================
 * TEST: QUẢN LÝ HOÀN TIỀN 4 MẮT & THU HỒI QUYỀN LỢI (SV4 - UC055, UC056)
 * ==============================================================================
 */
@ExtendWith(MockitoExtension.class)
class RefundManagementServiceTest {

    @Mock
    private RefundRequestRepository refundRequestRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private RefundManagementService refundManagementService;

    @Nested
    @DisplayName("1. Đề xuất hoàn tiền (Mắt 1 & 2 - Propose Refund)")
    class ProposeRefundTests {

        @Test
        @DisplayName("Lập đề xuất thành công khi số tiền hợp lệ và đơn hàng đã SUCCESS")
        void proposeRefund_Success() {
            Transaction tx = Transaction.builder()
                    .transactionId(10L)
                    .userId(5L)
                    .gatewayTransactionId("LP-ORDER-10")
                    .amount(BigDecimal.valueOf(100_000))
                    .status(TransactionStatus.SUCCESS)
                    .build();

            when(transactionRepository.findById(10L)).thenReturn(Optional.of(tx));
            when(refundRequestRepository.sumCommittedRefundsByTransactionId(10L, null))
                    .thenReturn(BigDecimal.valueOf(20_000));

            RefundRequest saved = RefundRequest.builder()
                    .refundId(1L)
                    .transactionId(10L)
                    .userId(5L)
                    .refundAmount(BigDecimal.valueOf(50_000))
                    .reason("Lỗi không đọc được bài")
                    .status(RefundStatus.PENDING)
                    .proposedBy(4L)
                    .build();

            when(refundRequestRepository.save(any(RefundRequest.class))).thenReturn(saved);

            ProposeRefundRequest req = ProposeRefundRequest.builder()
                    .orderId(10L)
                    .refundAmount(BigDecimal.valueOf(50_000))
                    .reason("Lỗi không đọc được bài")
                    .affectedBenefit("Thu hồi quyền mua bài")
                    .build();

            RefundDetailResponse response = refundManagementService.proposeRefund(4L, req);

            assertNotNull(response);
            assertEquals("1", response.getId());
            assertEquals("PENDING", response.getStatus());
            assertEquals(BigDecimal.valueOf(50_000), response.getRefundAmount());
            verify(refundRequestRepository).save(any(RefundRequest.class));
        }

        @Test
        @DisplayName("Thất bại khi vi phạm Rule 11 (Refund Cap vượt quá số tiền còn lại)")
        void proposeRefund_ViolatesRefundCap() {
            Transaction tx = Transaction.builder()
                    .transactionId(10L)
                    .userId(5L)
                    .amount(BigDecimal.valueOf(100_000))
                    .status(TransactionStatus.SUCCESS)
                    .build();

            when(transactionRepository.findById(10L)).thenReturn(Optional.of(tx));
            when(refundRequestRepository.sumCommittedRefundsByTransactionId(10L, null))
                    .thenReturn(BigDecimal.valueOf(70_000)); // Đã hoàn hoặc chờ hoàn 70k, chỉ còn 30k

            ProposeRefundRequest req = ProposeRefundRequest.builder()
                    .orderId(10L)
                    .refundAmount(BigDecimal.valueOf(40_000)) // Đòi hoàn 40k > 30k
                    .reason("Yêu cầu quá hạn mức")
                    .build();

            AppException ex = assertThrows(AppException.class,
                    () -> refundManagementService.proposeRefund(4L, req));

            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Vi phạm Rule 11 (Refund Cap)"));
        }

        @Test
        @DisplayName("Thất bại khi đơn hàng chưa thanh toán thành công")
        void proposeRefund_OriginalTxNotSuccess() {
            Transaction tx = Transaction.builder()
                    .transactionId(10L)
                    .status(TransactionStatus.PENDING)
                    .build();

            when(transactionRepository.findById(10L)).thenReturn(Optional.of(tx));

            ProposeRefundRequest req = ProposeRefundRequest.builder()
                    .orderId(10L)
                    .refundAmount(BigDecimal.valueOf(50_000))
                    .build();

            AppException ex = assertThrows(AppException.class,
                    () -> refundManagementService.proposeRefund(4L, req));

            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        }
    }

    @Nested
    @DisplayName("2. Phê duyệt hoàn tiền & Thu hồi quyền lợi (Mắt 3 & 4 - Four-Eyes Principle & Rights Adjustment)")
    class ReviewRefundTests {

        @Test
        @DisplayName("Thất bại khi người phê duyệt trùng với người đề xuất (Four-Eyes Principle)")
        void reviewRefund_FailsWhenSameUser() {
            RefundRequest refund = RefundRequest.builder()
                    .refundId(1L)
                    .proposedBy(4L) // Kế toán #4 đề xuất
                    .status(RefundStatus.PENDING)
                    .build();

            when(refundRequestRepository.findById(1L)).thenReturn(Optional.of(refund));

            ReviewRefundRequest req = ReviewRefundRequest.builder()
                    .approved(true)
                    .reviewNotes("Tự duyệt cho chính mình")
                    .build();

            AppException ex = assertThrows(AppException.class,
                    () -> refundManagementService.reviewRefund(4L, 1L, req)); // Kế toán #4 cố tình duyệt

            assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
            assertTrue(ex.getMessage().contains("Four-Eyes Principle"));
        }

        @Test
        @DisplayName("Phê duyệt thành công: tạo bút toán hoàn tiền và thu hồi quyền mua bài lẻ (UC056)")
        void reviewRefund_ApproveAndRevokePurchase() {
            RefundRequest refund = RefundRequest.builder()
                    .refundId(1L)
                    .transactionId(10L)
                    .userId(5L)
                    .refundAmount(BigDecimal.valueOf(15_000))
                    .proposedBy(4L) // Proposer: 4
                    .status(RefundStatus.PENDING)
                    .build();

            Transaction originalTx = Transaction.builder()
                    .transactionId(10L)
                    .userId(5L)
                    .gatewayTransactionId("LP-ARTICLE-10")
                    .purchaseId(99L)
                    .amount(BigDecimal.valueOf(15_000))
                    .currency("VND")
                    .paymentMethod("SEPAY")
                    .status(TransactionStatus.SUCCESS)
                    .build();

            when(refundRequestRepository.findById(1L)).thenReturn(Optional.of(refund));
            when(transactionRepository.findById(10L)).thenReturn(Optional.of(originalTx));
            when(refundRequestRepository.sumCommittedRefundsByTransactionId(10L, null))
                    .thenReturn(BigDecimal.valueOf(15_000)); // Hoàn đủ 15.000đ -> originalTx thành REFUNDED

            ReviewRefundRequest req = ReviewRefundRequest.builder()
                    .approved(true)
                    .reviewNotes("Đã xác nhận lỗi tải bài, đồng ý hoàn tiền")
                    .build();

            RefundDetailResponse res = refundManagementService.reviewRefund(2L, 1L, req); // Reviewer: 2 != 4

            assertEquals("COMPLETED", res.getStatus());
            assertEquals(TransactionStatus.REFUNDED, originalTx.getStatus());

            // Kiểm tra lưu bút toán đảo
            verify(transactionRepository).save(argThat(tx ->
                    tx.getTransactionType() == TransactionType.REFUND &&
                    tx.getAmount().compareTo(BigDecimal.valueOf(15_000)) == 0 &&
                    tx.getOriginalTransactionId().equals(10L)
            ));

            // Kiểm tra thu hồi quyền truy cập bài viết (UC056)
            verify(jdbcTemplate).update(
                    eq("UPDATE article_purchases SET access_status = 'REVOKED' WHERE purchase_id = ?"),
                    eq(99L)
            );
        }

        @Test
        @DisplayName("Từ chối hoàn tiền: cập nhật trạng thái REJECTED và không thu hồi quyền lợi")
        void reviewRefund_Reject() {
            RefundRequest refund = RefundRequest.builder()
                    .refundId(2L)
                    .transactionId(20L)
                    .proposedBy(4L)
                    .status(RefundStatus.PENDING)
                    .build();

            Transaction originalTx = Transaction.builder()
                    .transactionId(20L)
                    .status(TransactionStatus.SUCCESS)
                    .build();

            when(refundRequestRepository.findById(2L)).thenReturn(Optional.of(refund));
            when(transactionRepository.findById(20L)).thenReturn(Optional.of(originalTx));

            ReviewRefundRequest req = ReviewRefundRequest.builder()
                    .approved(false)
                    .reviewNotes("Không đủ chứng từ ngân hàng")
                    .build();

            RefundDetailResponse res = refundManagementService.reviewRefund(3L, 2L, req);

            assertEquals("REJECTED", res.getStatus());
            verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
        }
    }
}
