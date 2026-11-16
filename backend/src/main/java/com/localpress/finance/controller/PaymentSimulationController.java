package com.localpress.finance.controller;

import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.finance.service.SePayService;
import com.localpress.finance.service.SepayGatewayService;
import com.localpress.finance.model.SepayWebhookLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * ==============================================================================
 * CHỈ DÙNG KHI DEMO (profile dev + cờ bật): GIẢ LẬP SEPAY BẮN WEBHOOK
 * ==============================================================================
 * Máy local không nhận được webhook thật từ SePay, nên nút "Giả lập đã chuyển khoản" trên trang
 * thanh toán gọi endpoint này. Nó dựng payload IPN rồi đi qua đúng hàm processSepayIpn như webhook
 * thật, nên idempotency / tiền về muộn / chuyển thiếu vẫn được kiểm chứng.
 * Bean chỉ tồn tại khi profile dev VÀ localpress.payment.simulation-enabled=true (đặt trong
 * backend/config/application-local.yml, gitignored). Mặc định tắt: deploy quên đổi profile thì chủ đơn vẫn
 * không tự đánh dấu đã trả được (audit PAY-07, Rule 4).
 */
@Slf4j
@Profile("dev")
@ConditionalOnProperty(prefix = "localpress.payment", name = "simulation-enabled", havingValue = "true")
@RestController
@RequestMapping("/api/v1/finance/orders/code/{orderCode}")
@RequiredArgsConstructor
public class PaymentSimulationController {

    private final PaymentProcessingService paymentProcessingService;
    private final FinanceCurrentUser currentUser;
    private final SepayGatewayService sepayGatewayService;
    private final SePayService sePayService;

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
                // Ngân hàng nhận lấy từ cấu hình localpress.sepay.bank-code, không ghi cứng
                .gateway(sePayService.getBankCode())
                .transferType("in")
                .code(orderCode)
                .content("LOCALPRESS " + orderCode)
                .amount(amount)
                .referenceCode(reference)
                .build();
        // Đi qua đúng cổng nhận tiền như webhook thật, ghi log nguồn SIMULATION để không lẫn với tiền thật
        SepayGatewayService.Outcome outcome = sepayGatewayService.receive(
                SepayWebhookLog.Source.SIMULATION, ipn, "{\"simulated\":true,\"orderCode\":\"" + orderCode
                        + "\",\"amount\":" + amount.toPlainString() + ",\"referenceCode\":\"" + reference + "\"}",
                true, "localhost");
        return ResponseEntity.ok(outcome.body());
    }
}
