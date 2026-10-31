package com.localpress.reader;

import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.reader.dto.PendingOrderTargetResponse;
import com.localpress.reader.repository.ReaderPurchaseRepository;
import com.localpress.reader.repository.ReaderPurchaseRepository.ActiveSubscription;
import com.localpress.reader.repository.ReaderPurchaseRepository.ArticleForSale;
import com.localpress.reader.repository.ReaderPurchaseRepository.PlanRow;
import com.localpress.reader.repository.ReaderPurchaseRepository.PurchaseRow;
import com.localpress.reader.service.ReaderPurchaseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReaderPurchaseServiceTest {

    private static final Long USER = 6L;
    private static final Long ARTICLE = 1L;
    private static final BigDecimal PRICE = new BigDecimal("15000.00");

    @Mock
    private ReaderPurchaseRepository repository;

    @Mock
    private PaymentProcessingService payments;

    @InjectMocks
    private ReaderPurchaseService service;

    @BeforeEach
    void stubFinanceOrder() {
        lenient().when(repository.findPendingOrderCode(any(), any(), any())).thenReturn(Optional.empty());
        lenient().when(payments.createOrder(any(), any())).thenReturn(
                OrderCreateResponse.builder().orderCode("LP-NEW").amount(PRICE).build());
    }

    private ArticleForSale premiumArticle() {
        return new ArticleForSale(ARTICLE, "PREMIUM", "PUBLISHED", PRICE, 2L, "Bài điều tra");
    }

    private void assertStatus(HttpStatus expected, Runnable action) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, action::run);
        assertEquals(expected, ex.getStatusCode());
    }

    @Test
    void createsNewPendingPurchaseWithPriceFromDatabase() {
        when(repository.findArticleForSale(ARTICLE)).thenReturn(Optional.of(premiumArticle()));
        when(repository.findActiveSubscriptions(eq(USER), any(LocalDate.class))).thenReturn(List.of());
        when(repository.findPurchase(USER, ARTICLE)).thenReturn(Optional.empty());
        when(repository.insertPendingPurchase(USER, ARTICLE, PRICE)).thenReturn(77L);

        PendingOrderTargetResponse response = service.createArticlePurchase(USER, ARTICLE);

        assertEquals("ARTICLE", response.getOrderType());
        assertEquals(77L, response.getTargetId());
        assertEquals(PRICE, response.getAmount());
        assertEquals("Bài điều tra", response.getTitle());
        assertEquals("LP-NEW", response.getOrderCode());
    }

    @Test
    void reusesPendingPurchaseAndRefreshesPrice() {
        when(repository.findArticleForSale(ARTICLE)).thenReturn(Optional.of(premiumArticle()));
        when(repository.findActiveSubscriptions(eq(USER), any(LocalDate.class))).thenReturn(List.of());
        when(repository.findPurchase(USER, ARTICLE)).thenReturn(Optional.of(new PurchaseRow(5L, "PENDING")));

        PendingOrderTargetResponse response = service.createArticlePurchase(USER, ARTICLE);

        assertEquals(5L, response.getTargetId());
        verify(repository).resetPurchaseToPending(5L, PRICE);
        verify(repository, never()).insertPendingPurchase(any(), any(), any());
    }

    @Test
    void reusesOpenFinanceOrderInsteadOfCreatingAnother() {
        when(repository.findArticleForSale(ARTICLE)).thenReturn(Optional.of(premiumArticle()));
        when(repository.findActiveSubscriptions(eq(USER), any(LocalDate.class))).thenReturn(List.of());
        when(repository.findPurchase(USER, ARTICLE)).thenReturn(Optional.of(new PurchaseRow(5L, "PENDING")));
        when(repository.findPendingOrderCode(USER, "ARTICLE", 5L)).thenReturn(Optional.of("LP-OLD"));

        PendingOrderTargetResponse response = service.createArticlePurchase(USER, ARTICLE);

        assertEquals("LP-OLD", response.getOrderCode());
        verify(payments, never()).createOrder(any(), any());
    }

    @Test
    void reusesRevokedPurchaseSoUserCanBuyAgainAfterFullRefund() {
        when(repository.findArticleForSale(ARTICLE)).thenReturn(Optional.of(premiumArticle()));
        when(repository.findActiveSubscriptions(eq(USER), any(LocalDate.class))).thenReturn(List.of());
        when(repository.findPurchase(USER, ARTICLE)).thenReturn(Optional.of(new PurchaseRow(9L, "REVOKED")));

        PendingOrderTargetResponse response = service.createArticlePurchase(USER, ARTICLE);

        assertEquals(9L, response.getTargetId());
        verify(repository).resetPurchaseToPending(9L, PRICE);
    }

    @Test
    void rejectsArticleAlreadyOwned() {
        when(repository.findArticleForSale(ARTICLE)).thenReturn(Optional.of(premiumArticle()));
        when(repository.findActiveSubscriptions(eq(USER), any(LocalDate.class))).thenReturn(List.of());
        when(repository.findPurchase(USER, ARTICLE)).thenReturn(Optional.of(new PurchaseRow(5L, "ACTIVE")));

        assertStatus(HttpStatus.CONFLICT, () -> service.createArticlePurchase(USER, ARTICLE));
        verify(repository, never()).resetPurchaseToPending(any(), any());
    }

    @Test
    void rejectsArticleCoveredByActiveSubscription() {
        when(repository.findArticleForSale(ARTICLE)).thenReturn(Optional.of(premiumArticle()));
        when(repository.findActiveSubscriptions(eq(USER), any(LocalDate.class)))
                .thenReturn(List.of(new ActiveSubscription(1L, 3L, LocalDate.now().minusDays(1), LocalDate.now().plusDays(30), "ALL", null)));

        assertStatus(HttpStatus.CONFLICT, () -> service.createArticlePurchase(USER, ARTICLE));
        verify(repository, never()).insertPendingPurchase(any(), any(), any());
    }

    @Test
    void categoryPlanOnAnotherCategoryDoesNotBlockSinglePurchase() {
        when(repository.findArticleForSale(ARTICLE)).thenReturn(Optional.of(premiumArticle()));
        when(repository.findActiveSubscriptions(eq(USER), any(LocalDate.class)))
                .thenReturn(List.of(new ActiveSubscription(1L, 3L, LocalDate.now().minusDays(1), LocalDate.now().plusDays(30), "CATEGORY", 9L)));
        when(repository.findPurchase(USER, ARTICLE)).thenReturn(Optional.empty());
        when(repository.insertPendingPurchase(USER, ARTICLE, PRICE)).thenReturn(88L);

        PendingOrderTargetResponse res = service.createArticlePurchase(USER, ARTICLE);

        assertEquals(88L, res.getTargetId());
    }

    @Test
    void rejectsFreeArticle() {
        when(repository.findArticleForSale(ARTICLE))
                .thenReturn(Optional.of(new ArticleForSale(ARTICLE, "FREE", "PUBLISHED", BigDecimal.ZERO, 2L, "Free")));

        assertStatus(HttpStatus.CONFLICT, () -> service.createArticlePurchase(USER, ARTICLE));
    }

    @Test
    void rejectsUnpublishedArticle() {
        when(repository.findArticleForSale(ARTICLE))
                .thenReturn(Optional.of(new ArticleForSale(ARTICLE, "PREMIUM", "DRAFT", PRICE, 2L, "Nháp")));

        assertStatus(HttpStatus.CONFLICT, () -> service.createArticlePurchase(USER, ARTICLE));
    }

    @Test
    void rejectsPremiumArticleWithoutPrice() {
        when(repository.findArticleForSale(ARTICLE))
                .thenReturn(Optional.of(new ArticleForSale(ARTICLE, "PREMIUM", "PUBLISHED", null, 2L, "Chưa giá")));

        assertStatus(HttpStatus.CONFLICT, () -> service.createArticlePurchase(USER, ARTICLE));
    }

    @Test
    void returnsNotFoundForMissingArticle() {
        when(repository.findArticleForSale(ARTICLE)).thenReturn(Optional.empty());

        assertStatus(HttpStatus.NOT_FOUND, () -> service.createArticlePurchase(USER, ARTICLE));
    }

    @Test
    void recoversFromConcurrentInsertByReadingExistingRow() {
        when(repository.findArticleForSale(ARTICLE)).thenReturn(Optional.of(premiumArticle()));
        when(repository.findActiveSubscriptions(eq(USER), any(LocalDate.class))).thenReturn(List.of());
        when(repository.findPurchase(USER, ARTICLE))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(new PurchaseRow(12L, "PENDING")));
        when(repository.insertPendingPurchase(USER, ARTICLE, PRICE)).thenThrow(new DuplicateKeyException("dup"));

        PendingOrderTargetResponse response = service.createArticlePurchase(USER, ARTICLE);

        assertEquals(12L, response.getTargetId());
        verify(repository).resetPurchaseToPending(12L, PRICE);
    }

    @Test
    void createsPendingSubscriptionWithPlanPrice() {
        when(repository.findPlan(1L)).thenReturn(Optional.of(new PlanRow(1L, "Gói Tháng", new BigDecimal("50000.00"), "ACTIVE")));
        when(repository.findPendingSubscriptionId(USER, 1L)).thenReturn(Optional.empty());
        when(repository.insertPendingSubscription(eq(USER), eq(1L), any(LocalDate.class))).thenReturn(40L);

        PendingOrderTargetResponse response = service.createSubscription(USER, 1L);

        assertEquals("SUBSCRIPTION", response.getOrderType());
        assertEquals(40L, response.getTargetId());
        assertEquals(new BigDecimal("50000.00"), response.getAmount());
        assertEquals("Gói Tháng", response.getTitle());
    }

    @Test
    void reusesPendingSubscriptionOfSamePlan() {
        when(repository.findPlan(1L)).thenReturn(Optional.of(new PlanRow(1L, "Gói Tháng", new BigDecimal("50000.00"), "ACTIVE")));
        when(repository.findPendingSubscriptionId(USER, 1L)).thenReturn(Optional.of(33L));

        PendingOrderTargetResponse response = service.createSubscription(USER, 1L);

        assertEquals(33L, response.getTargetId());
        verify(repository).refreshPendingSubscription(eq(33L), any(LocalDate.class));
        verify(repository, never()).insertPendingSubscription(any(), any(), any());
    }

    @Test
    void allowsBuyingSubscriptionWhileAnotherIsActiveForRenewal() {
        when(repository.findPlan(1L)).thenReturn(Optional.of(new PlanRow(1L, "Gói Tháng", new BigDecimal("50000.00"), "ACTIVE")));
        when(repository.findPendingSubscriptionId(USER, 1L)).thenReturn(Optional.empty());
        when(repository.insertPendingSubscription(eq(USER), eq(1L), any(LocalDate.class))).thenReturn(41L);

        PendingOrderTargetResponse response = service.createSubscription(USER, 1L);

        assertEquals(41L, response.getTargetId());
        verify(repository, never()).findActiveSubscriptions(any(), any());
    }

    @Test
    void rejectsInactivePlan() {
        when(repository.findPlan(2L)).thenReturn(Optional.of(new PlanRow(2L, "Gói Quý", new BigDecimal("135000.00"), "INACTIVE")));

        assertStatus(HttpStatus.CONFLICT, () -> service.createSubscription(USER, 2L));
    }

    @Test
    void returnsNotFoundForMissingPlan() {
        when(repository.findPlan(99L)).thenReturn(Optional.empty());

        assertStatus(HttpStatus.NOT_FOUND, () -> service.createSubscription(USER, 99L));
    }
}
