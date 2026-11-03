package com.localpress.reader;

import com.localpress.reader.repository.ReaderEntitlementRepository;
import com.localpress.reader.repository.ReaderEntitlementRepository.PurchaseForGrant;
import com.localpress.reader.repository.ReaderEntitlementRepository.SubscriptionForGrant;
import com.localpress.reader.service.ReaderEntitlementListener;
import com.localpress.shared.event.PaymentSuccessEvent;
import com.localpress.shared.event.RefundCompletedEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReaderEntitlementListenerTest {

    private static final Long USER = 6L;
    private static final LocalDateTime PAID_AT = LocalDateTime.of(2026, 10, 26, 16, 0);
    private static final LocalDate PAID_DATE = PAID_AT.toLocalDate();

    @Mock
    private ReaderEntitlementRepository repository;

    @InjectMocks
    private ReaderEntitlementListener listener;

    private PaymentSuccessEvent paid(String type, Long targetId, long amount) {
        return PaymentSuccessEvent.builder()
                .transactionId(100L).userId(USER).transactionType(type).targetId(targetId)
                .amount(BigDecimal.valueOf(amount)).paidAt(PAID_AT).build();
    }

    private PurchaseForGrant purchase(String status) {
        return new PurchaseForGrant(2L, USER, new BigDecimal("15000.00"), status);
    }

    private SubscriptionForGrant subscription(String status) {
        return new SubscriptionForGrant(5L, USER, status, new BigDecimal("50000.00"), 30);
    }

    // ---------- bài lẻ ----------

    @Test
    void activatesPendingPurchaseWhenPaidEnough() {
        when(repository.findPurchaseForGrant(2L)).thenReturn(Optional.of(purchase("PENDING")));

        listener.onPaymentSuccess(paid("ARTICLE", 2L, 15000));

        verify(repository).activatePurchase(2L, PAID_AT);
    }

    @Test
    void rejectsPurchaseWhenAmountIsBelowPrice() {
        when(repository.findPurchaseForGrant(2L)).thenReturn(Optional.of(purchase("PENDING")));

        listener.onPaymentSuccess(paid("ARTICLE", 2L, 5000));

        verify(repository, never()).activatePurchase(any(), any());
    }

    @Test
    void rejectsPurchaseOfAnotherUser() {
        when(repository.findPurchaseForGrant(2L))
                .thenReturn(Optional.of(new PurchaseForGrant(2L, 99L, new BigDecimal("15000.00"), "PENDING")));

        listener.onPaymentSuccess(paid("ARTICLE", 2L, 15000));

        verify(repository, never()).activatePurchase(any(), any());
    }

    @Test
    void skipsAlreadyActivePurchaseSoReplayIsIdempotent() {
        when(repository.findPurchaseForGrant(2L)).thenReturn(Optional.of(purchase("ACTIVE")));

        listener.onPaymentSuccess(paid("ARTICLE", 2L, 15000));

        verify(repository, never()).activatePurchase(any(), any());
    }

    @Test
    void rejectsRevokedPurchase() {
        when(repository.findPurchaseForGrant(2L)).thenReturn(Optional.of(purchase("REVOKED")));

        listener.onPaymentSuccess(paid("ARTICLE", 2L, 15000));

        verify(repository, never()).activatePurchase(any(), any());
    }

    @Test
    void missingPurchaseDoesNotThrowOrWrite() {
        when(repository.findPurchaseForGrant(2L)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> listener.onPaymentSuccess(paid("ARTICLE", 2L, 15000)));

        verify(repository, never()).activatePurchase(any(), any());
    }

    // ---------- gói cước ----------

    @Test
    void activatesSubscriptionFromPaidDateWhenNoCurrentPlan() {
        when(repository.findSubscriptionForGrant(5L)).thenReturn(Optional.of(subscription("PENDING")));
        when(repository.findLatestActiveEndDate(USER, PAID_DATE)).thenReturn(Optional.empty());

        listener.onPaymentSuccess(paid("SUBSCRIPTION", 5L, 50000));

        verify(repository).activateSubscription(5L, PAID_DATE, PAID_DATE.plusDays(30));
    }

    @Test
    void renewalStartsDayAfterCurrentPlanEnds() {
        LocalDate currentEnd = PAID_DATE.plusDays(10);
        when(repository.findSubscriptionForGrant(5L)).thenReturn(Optional.of(subscription("PENDING")));
        when(repository.findLatestActiveEndDate(USER, PAID_DATE)).thenReturn(Optional.of(currentEnd));

        listener.onPaymentSuccess(paid("SUBSCRIPTION", 5L, 50000));

        verify(repository).activateSubscription(5L, currentEnd.plusDays(1), currentEnd.plusDays(1).plusDays(30));
    }

    @Test
    void planEndingTodayDoesNotDelayNewPlanBeyondPaidDate() {
        when(repository.findSubscriptionForGrant(5L)).thenReturn(Optional.of(subscription("PENDING")));
        when(repository.findLatestActiveEndDate(USER, PAID_DATE)).thenReturn(Optional.of(PAID_DATE));

        listener.onPaymentSuccess(paid("SUBSCRIPTION", 5L, 50000));

        verify(repository).activateSubscription(5L, PAID_DATE.plusDays(1), PAID_DATE.plusDays(31));
    }

    @Test
    void rejectsSubscriptionWhenAmountIsBelowPlanPrice() {
        when(repository.findSubscriptionForGrant(5L)).thenReturn(Optional.of(subscription("PENDING")));

        listener.onPaymentSuccess(paid("SUBSCRIPTION", 5L, 10000));

        verify(repository, never()).activateSubscription(any(), any(), any());
    }

    @Test
    void skipsAlreadyActiveSubscriptionSoReplayIsIdempotent() {
        when(repository.findSubscriptionForGrant(5L)).thenReturn(Optional.of(subscription("ACTIVE")));

        listener.onPaymentSuccess(paid("SUBSCRIPTION", 5L, 50000));

        verify(repository, never()).activateSubscription(any(), any(), any());
    }

    @Test
    void rejectsSubscriptionOfAnotherUser() {
        when(repository.findSubscriptionForGrant(5L))
                .thenReturn(Optional.of(new SubscriptionForGrant(5L, 99L, "PENDING", new BigDecimal("50000.00"), 30)));

        listener.onPaymentSuccess(paid("SUBSCRIPTION", 5L, 50000));

        verify(repository, never()).activateSubscription(any(), any(), any());
    }

    // ---------- an toàn transaction của SV4 ----------

    @Test
    void databaseErrorIsSwallowedSoWebhookTransactionIsNotRolledBack() {
        when(repository.findPurchaseForGrant(2L)).thenThrow(new IllegalStateException("db lỗi"));

        assertDoesNotThrow(() -> listener.onPaymentSuccess(paid("ARTICLE", 2L, 15000)));
    }

    @Test
    void ignoresAdAndRefundTypes() {
        listener.onPaymentSuccess(paid("AD", 3L, 45000000));
        listener.onPaymentSuccess(paid("REFUND", 3L, 1000));

        verify(repository, never()).findPurchaseForGrant(any());
        verify(repository, never()).findSubscriptionForGrant(any());
    }

    // ---------- hoàn tiền ----------

    private RefundCompletedEvent refund(String type, Long targetId, boolean full) {
        return RefundCompletedEvent.builder()
                .refundId(1L).userId(USER).transactionType(type).targetId(targetId).fullRefund(full).build();
    }

    @Test
    void fullRefundRevokesArticle() {
        listener.onRefundCompleted(refund("ARTICLE", 2L, true));

        verify(repository).revokePurchase(2L, USER);
    }

    @Test
    void fullRefundCancelsOnlyThatSubscriptionPeriod() {
        listener.onRefundCompleted(refund("SUBSCRIPTION", 5L, true));

        verify(repository).cancelSubscription(5L, USER);
        verify(repository, never()).cancelSubscription(eq(6L), any());
    }

    @Test
    void partialRefundKeepsRights() {
        listener.onRefundCompleted(refund("ARTICLE", 2L, false));
        listener.onRefundCompleted(refund("SUBSCRIPTION", 5L, false));

        verify(repository, never()).revokePurchase(any(), any());
        verify(repository, never()).cancelSubscription(any(), any());
    }

    @Test
    void refundErrorIsSwallowed() {
        when(repository.revokePurchase(2L, USER)).thenThrow(new IllegalStateException("db lỗi"));

        assertDoesNotThrow(() -> listener.onRefundCompleted(refund("ARTICLE", 2L, true)));
    }
}
