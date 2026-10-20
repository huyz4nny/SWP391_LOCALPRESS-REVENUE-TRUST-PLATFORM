package com.localpress.finance.controller;

import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * ==============================================================================
 * CHỈ DÙNG KHI DEMO (profile dev): GIẢ LẬP SEPAY BẮN WEBHOOK
 * ==============================================================================
 * Máy local không nhận được webhook thật từ SePay, nên nút "Giả lập đã chuyển khoản" trên trang
 * thanh toán gọi endpoint này. Nó dựng payload IPN rồi đi qua đúng hàm processSepayIpn như webhook
 * thật, nên idempotency / tiền về muộn / chuyển thiếu vẫn được kiểm chứng.
 * Bean không tồn tại ở profile khác dev.
 */
@Slf4j
@Profile("dev")
@RestController
@RequestMapping("/api/v1/finance/orders/code/{orderCode}")
@RequiredArgsConstructor
public class PaymentSimulationController {

    private final PaymentProcessingService paymentProcessingService;
    private final FinanceCurrentUser currentUser;

    @PostMapping("/simulate-ipn")
    public ResponseEntity<Map<String, Object>> simulateIpn(
            @PathVariable String orderCode,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        OrderStatusResponse order = paymentProcessingService.getOrderStatusByCode(currentUser.require(), orderCode);

        BigDecimal amount = body != null && body.get("amount") != null
                ? new BigDecimal(body.get("amount").toString())
                : order.getAmount();
        // Cho phép bắn lại cùng 1 mã tham chiếu để demo webhook lặp (Rule 5)
        String reference = body != null && body.get("referenceCode") != null
                ? body.get("referenceCode").toString()
                : "SIM" + System.currentTimeMillis();

        log.warn("DEV: giả lập IPN SePay cho đơn {} số tiền {}", orderCode, amount);
        SepayIpnRequest ipn = SepayIpnRequest.builder()
                .gateway("Vietcombank")
                .transferType("in")
                .content("LOCALPRESS " + orderCode)
                .amount(amount)
                .referenceCode(reference)
                .build();
        return ResponseEntity.ok(paymentProcessingService.processSepayIpn(ipn));
    }
}
