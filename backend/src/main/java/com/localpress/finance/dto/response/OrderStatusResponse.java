package com.localpress.finance.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * DTO: TRA CỨU TRẠNG THÁI ĐƠN HÀNG (SV4 - UC050)
 * ==============================================================================
 * Dùng cho màn hình thanh toán Checkout phía Frontend để polling trạng thái đơn hàng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusResponse {

    private Long transactionId;

    private String orderCode;

    private String status;

    private boolean isPaid;

    private BigDecimal amount;

    private String currency;

    private String paymentMethod;

    private LocalDateTime paidAt;

    private LocalDateTime createdAt;
}
