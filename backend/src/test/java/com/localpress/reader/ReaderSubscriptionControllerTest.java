package com.localpress.reader;

import com.localpress.reader.controller.ReaderPurchaseExceptionHandler;
import com.localpress.reader.controller.ReaderSubscriptionController;
import com.localpress.reader.dto.ReaderSubscriptionResponse;
import com.localpress.reader.service.ReaderCurrentUser;
import com.localpress.reader.service.ReaderSubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReaderSubscriptionControllerTest {

    private ReaderSubscriptionService subscriptionService;
    private ReaderCurrentUser currentUser;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        subscriptionService = mock(ReaderSubscriptionService.class);
        currentUser = mock(ReaderCurrentUser.class);
        mvc = MockMvcBuilders
                .standaloneSetup(new ReaderSubscriptionController(subscriptionService, currentUser))
                .setControllerAdvice(new ReaderPurchaseExceptionHandler())
                .build();
    }

    @Test
    void listUsesSessionUser() throws Exception {
        when(currentUser.requireUserId()).thenReturn(9L);
        when(subscriptionService.listMine(9L)).thenReturn(List.of(sample(true)));

        mvc.perform(get("/api/v1/reader/subscriptions/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subscriptionId").value(4))
                .andExpect(jsonPath("$[0].accessScope").value("ALL"))
                .andExpect(jsonPath("$[0].inEffect").value(true));
    }

    @Test
    void guestGets401() throws Exception {
        when(currentUser.requireUserId())
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập"));

        mvc.perform(get("/api/v1/reader/subscriptions/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bạn cần đăng nhập"));
    }

    @Test
    void cancelUsesSessionUser() throws Exception {
        when(currentUser.requireUserId()).thenReturn(9L);
        when(subscriptionService.cancelAutoRenew(9L, 4L)).thenReturn(sample(false));

        mvc.perform(post("/api/v1/reader/subscriptions/4/cancel-auto-renew"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.autoRenew").value(false))
                .andExpect(jsonPath("$.subscriptionId").value(4));
        verify(subscriptionService).cancelAutoRenew(9L, 4L);
    }

    private static ReaderSubscriptionResponse sample(boolean autoRenew) {
        return new ReaderSubscriptionResponse(
                4L, 1L, "Gói tháng", new BigDecimal("50000.00"), "ALL", null, null,
                LocalDate.of(2026, 10, 29), LocalDate.of(2026, 11, 28),
                autoRenew, false, false, true);
    }
}
