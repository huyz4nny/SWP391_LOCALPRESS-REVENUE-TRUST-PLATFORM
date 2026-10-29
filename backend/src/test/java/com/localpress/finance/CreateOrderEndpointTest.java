package com.localpress.finance;

import com.localpress.finance.controller.FinanceExceptionHandler;
import com.localpress.finance.controller.PaymentProcessingController;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * POST /api/v1/finance/orders (alias /checkout): trình duyệt không được tự đặt giá / targetId (Rule 4, Rule 14).
 * Đơn có đối tượng do module sở hữu tạo từ server (mẫu AdBookingService), endpoint chỉ mở khi chạy E2E.
 */
@ExtendWith(MockitoExtension.class)
class CreateOrderEndpointTest {

    private static final String BODY =
            "{\"orderType\":\"ARTICLE\",\"targetId\":1,\"amount\":1000,\"targetTitle\":\"Bai F12\"}";

    @Mock
    private PaymentProcessingService paymentProcessingService;

    @Mock
    private FinanceCurrentUser currentUser;

    @InjectMocks
    private PaymentProcessingController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new FinanceExceptionHandler())
                .build();
        when(currentUser.require()).thenReturn(new FinanceCurrentUser.Principal(2L, "READER"));
    }

    @Test
    @DisplayName("Mặc định: trình duyệt tự tạo đơn (giá tự gửi) bị chặn 403, không tạo đơn")
    void clientOrderBlockedByDefault() throws Exception {
        for (String path : new String[]{"/api/v1/finance/orders", "/api/v1/finance/checkout"}) {
            mockMvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andExpect(status().isForbidden());
        }
        verify(paymentProcessingService, never()).createOrder(any(), any());
    }

    @Test
    @DisplayName("Bật cờ E2E: tạo đơn như cũ, user lấy từ phiên đăng nhập")
    void clientOrderAllowedWhenFlagOn() throws Exception {
        ReflectionTestUtils.setField(controller, "clientOrdersEnabled", true);
        when(paymentProcessingService.createOrder(eq(2L), any()))
                .thenReturn(OrderCreateResponse.builder().orderCode("LP1").build());

        mockMvc.perform(post("/api/v1/finance/orders").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk());
        verify(paymentProcessingService).createOrder(eq(2L), any());
    }
}
