package com.localpress.reader;

import com.localpress.reader.controller.ReaderPurchaseController;
import com.localpress.reader.controller.ReaderPurchaseExceptionHandler;
import com.localpress.reader.dto.PendingOrderTargetResponse;
import com.localpress.reader.service.ReaderCurrentUser;
import com.localpress.reader.service.ReaderPurchaseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReaderPurchaseControllerTest {

    private ReaderPurchaseService purchaseService;
    private ReaderCurrentUser currentUser;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        purchaseService = mock(ReaderPurchaseService.class);
        currentUser = mock(ReaderCurrentUser.class);
        mvc = MockMvcBuilders
                .standaloneSetup(new ReaderPurchaseController(purchaseService, currentUser))
                .setControllerAdvice(new ReaderPurchaseExceptionHandler())
                .build();
    }

    @Test
    void articlePurchaseUsesUserFromSessionAndReturnsTarget() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(purchaseService.createArticlePurchase(6L, 1L)).thenReturn(PendingOrderTargetResponse.builder()
                .orderType("ARTICLE").targetId(77L).amount(new BigDecimal("15000.00")).title("Bài điều tra").orderCode("LP-A").build());

        mvc.perform(post("/api/v1/reader/article-purchases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"articleId\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderType").value("ARTICLE"))
                .andExpect(jsonPath("$.targetId").value(77))
                .andExpect(jsonPath("$.amount").value(15000.00))
                .andExpect(jsonPath("$.orderCode").value("LP-A"));
    }

    @Test
    void subscriptionReturnsSubscriptionTarget() throws Exception {
        when(currentUser.requireUserId()).thenReturn(7L);
        when(purchaseService.createSubscription(7L, 1L)).thenReturn(PendingOrderTargetResponse.builder()
                .orderType("SUBSCRIPTION").targetId(40L).amount(new BigDecimal("50000.00")).title("Gói Tháng").build());

        mvc.perform(post("/api/v1/reader/subscriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderType").value("SUBSCRIPTION"))
                .andExpect(jsonPath("$.targetId").value(40));
    }

    @Test
    void missingArticleIdReturns400WithFieldError() throws Exception {
        mvc.perform(post("/api/v1/reader/article-purchases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.articleId").exists());
        verify(purchaseService, never()).createArticlePurchase(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void notLoggedInReturns401WithMessage() throws Exception {
        when(currentUser.requireUserId())
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập"));

        mvc.perform(post("/api/v1/reader/subscriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":1}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bạn cần đăng nhập"));
    }

    @Test
    void businessConflictReturns409WithReadableMessage() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(purchaseService.createArticlePurchase(6L, 2L))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã mua bài viết này"));

        mvc.perform(post("/api/v1/reader/article-purchases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"articleId\":2}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Bạn đã mua bài viết này"));
    }
}
