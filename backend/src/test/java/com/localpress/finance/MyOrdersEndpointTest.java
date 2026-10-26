package com.localpress.finance;

import com.localpress.finance.controller.PaymentProcessingController;
import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/v1/finance/orders/me: user lấy từ phiên đăng nhập, không bị nhầm sang /orders/{id}.
 */
@ExtendWith(MockitoExtension.class)
class MyOrdersEndpointTest {

    @Mock
    private PaymentProcessingService paymentProcessingService;

    @Mock
    private FinanceCurrentUser currentUser;

    @InjectMocks
    private PaymentProcessingController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("/orders/me trả đơn của user đang đăng nhập, truyền đúng type/page/size")
    void myOrdersUsesSessionUser() throws Exception {
        when(currentUser.require()).thenReturn(new FinanceCurrentUser.Principal(7L, "READER"));
        OrderStatusResponse order = OrderStatusResponse.builder()
                .orderCode("LP1").orderType("SUBSCRIPTION").status("SUCCESS")
                .amount(new BigDecimal("99000")).targetId(12L).build();
        when(paymentProcessingService.getMyOrders(7L, "SUBSCRIPTION", 1, 5))
                .thenReturn(new PageImpl<>(List.of(order), PageRequest.of(1, 5), 6));

        mockMvc.perform(get("/api/v1/finance/orders/me").param("type", "SUBSCRIPTION").param("page", "1").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].orderCode").value("LP1"))
                .andExpect(jsonPath("$.data.content[0].targetId").value(12))
                .andExpect(jsonPath("$.data.totalElements").value(6));

        verify(paymentProcessingService, never()).getOrderStatus(any(), anyLong());
    }
}
