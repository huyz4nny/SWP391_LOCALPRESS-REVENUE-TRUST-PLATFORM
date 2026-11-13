package com.localpress.reader;

import com.localpress.reader.repository.ReaderNotificationRepository;
import com.localpress.reader.repository.ReaderNotificationRepository.RefundContext;
import com.localpress.reader.service.RefundResultNotificationService;
import com.localpress.shared.event.RefundCompletedEvent;
import com.localpress.shared.event.RefundRejectedEvent;
import com.localpress.shared.mail.MailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RefundResultNotificationServiceTest {

    ReaderNotificationRepository repository = mock(ReaderNotificationRepository.class);
    MailService mail = mock(MailService.class);
    RefundResultNotificationService service =
            new RefundResultNotificationService(repository, mail, mock(PlatformTransactionManager.class));

    @BeforeEach
    void setUp() {
        when(repository.findRefundContext(30L)).thenReturn(Optional.of(new RefundContext("LP-ORDER-30", "Cảng Lạch Huyện")));
        when(repository.findActiveUserEmail(7L)).thenReturn(Optional.of("an@test.vn"));
        when(repository.insertInApp(anyLong(), anyString(), anyString(), anyString(), any(), anyString())).thenReturn(1);
    }

    @Test
    void completedArticleRefundWritesDetailedInAppAndShortEmail() {
        when(mail.send(anyString(), anyString(), anyString())).thenReturn(true);

        service.recordCompleted(completed("ARTICLE", true, "Bài lỗi hiển thị"));

        ArgumentCaptor<String> content = ArgumentCaptor.forClass(String.class);
        verify(repository).insertInApp(eq(7L), eq(ReaderNotificationRepository.TYPE_REFUND_COMPLETED),
                eq("Đã hoàn tiền 15.000 ₫"), content.capture(), eq("/account/orders"), eq("REFUND_COMPLETED:5"));
        assertTrue(content.getValue().contains("LP-ORDER-30"));
        assertTrue(content.getValue().contains("Cảng Lạch Huyện"));
        assertTrue(content.getValue().contains("Bài lỗi hiển thị"));
        assertTrue(content.getValue().contains("Quyền đọc của đơn này đã kết thúc"));

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mail).send(eq("an@test.vn"), anyString(), body.capture());
        // email chưa xác minh nên không được lộ số tiền hay mã đơn
        assertFalse(body.getValue().contains("15.000"));
        assertFalse(body.getValue().contains("LP-ORDER-30"));
        verify(repository).insertEmailLog(eq(7L), eq(ReaderNotificationRepository.TYPE_REFUND_COMPLETED),
                anyString(), anyString(), eq(true), eq("REFUND_COMPLETED:5:EMAIL"));
    }

    @Test
    void rejectedSubscriptionRefundIncludesReviewNotes() {
        service.recordRejected(RefundRejectedEvent.builder()
                .refundId(6L).originalTransactionId(30L).userId(7L).transactionType("SUBSCRIPTION")
                .refundAmount(new BigDecimal("99000")).reviewNotes("Đã đọc quá 50% kỳ").build());

        ArgumentCaptor<String> content = ArgumentCaptor.forClass(String.class);
        verify(repository).insertInApp(eq(7L), eq(ReaderNotificationRepository.TYPE_REFUND_REJECTED),
                eq("Yêu cầu hoàn tiền không được duyệt"), content.capture(), anyString(), eq("REFUND_REJECTED:6"));
        assertTrue(content.getValue().contains("99.000 ₫"));
        assertTrue(content.getValue().contains("Đã đọc quá 50% kỳ"));
    }

    @Test
    void advertisingRefundIsLeftToSv1() {
        service.recordCompleted(completed("AD", false, null));

        verifyNoInteractions(mail);
        verify(repository, never()).insertInApp(anyLong(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void sameEventTwiceDoesNotSendSecondEmail() {
        when(repository.insertInApp(anyLong(), anyString(), anyString(), anyString(), any(), anyString())).thenReturn(0);

        service.recordCompleted(completed("ARTICLE", false, null));

        verifyNoInteractions(mail);
        verify(repository, never()).insertEmailLog(anyLong(), anyString(), anyString(), anyString(), anyBoolean(), anyString());
    }

    @Test
    void mailFailureIsRecordedAsFailed() {
        when(mail.send(anyString(), anyString(), anyString())).thenReturn(false);

        service.recordCompleted(completed("ARTICLE", false, null));

        verify(repository).insertEmailLog(eq(7L), anyString(), anyString(), anyString(), eq(false), eq("REFUND_COMPLETED:5:EMAIL"));
    }

    @Test
    void lockedAccountGetsInAppOnlyAndEmailMarkedFailed() {
        when(repository.findActiveUserEmail(7L)).thenReturn(Optional.empty());

        service.recordCompleted(completed("ARTICLE", false, null));

        verifyNoInteractions(mail);
        verify(repository).insertEmailLog(eq(7L), anyString(), anyString(), anyString(), eq(false), anyString());
    }

    @Test
    void orderLookupFailureStillNotifiesWithTransactionId() {
        when(repository.findRefundContext(30L)).thenThrow(new org.springframework.jdbc.BadSqlGrammarException(
                "lookup", "SELECT", new java.sql.SQLException("Unknown column")));

        service.recordCompleted(completed("ARTICLE", false, null));

        ArgumentCaptor<String> content = ArgumentCaptor.forClass(String.class);
        verify(repository).insertInApp(eq(7L), eq(ReaderNotificationRepository.TYPE_REFUND_COMPLETED),
                anyString(), content.capture(), anyString(), eq("REFUND_COMPLETED:5"));
        assertTrue(content.getValue().contains("đơn #30"));
    }

    @Test
    void moneyUsesVietnameseGrouping() {
        assertEquals("1.250.000 ₫", invokeMoney(new BigDecimal("1250000")));
    }

    private static String invokeMoney(BigDecimal amount) {
        try {
            var method = RefundResultNotificationService.class.getDeclaredMethod("money", BigDecimal.class);
            method.setAccessible(true);
            return (String) method.invoke(null, amount);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static RefundCompletedEvent completed(String type, boolean full, String reason) {
        return RefundCompletedEvent.builder()
                .refundId(5L).originalTransactionId(30L).userId(7L).transactionType(type)
                .refundAmount(new BigDecimal("15000")).fullRefund(full).reason(reason).build();
    }
}
