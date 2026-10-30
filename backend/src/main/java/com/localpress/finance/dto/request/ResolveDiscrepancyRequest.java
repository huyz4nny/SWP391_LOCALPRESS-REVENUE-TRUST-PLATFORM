package com.localpress.finance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * UC054: Xử lý 1 khoản lệch.
 * - ASSIGN_ORDER  : cần orderCode; chạy đúng luồng webhook cho đơn đó.
 * - CREDIT_WALLET : cần userId (hoặc orderCode để lấy chủ đơn); cộng ví khách.
 * - EXPLAINED     : chỉ ghi giải trình (mặc định khi không gửi action).
 * amount chỉ dùng khi SePay không báo số tiền (AMOUNT_MISSING): kế toán nhập theo sao kê.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolveDiscrepancyRequest {

    @NotBlank(message = "ID sai lệch không được để trống")
    private String discrepancyId;

    @NotBlank(message = "Ghi chú giải quyết không được để trống")
    private String note;

    private String action;

    private String orderCode;

    private Long userId;

    @Positive(message = "Số tiền phải lớn hơn 0")
    private BigDecimal amount;
}
