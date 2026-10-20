package com.localpress.finance.controller;

import com.localpress.finance.dto.request.TopUpRequest;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.dto.response.WalletResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.finance.service.WalletService;
import com.localpress.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * ==============================================================================
 * CONTROLLER: VÍ LOCALPRESS & NẠP TIỀN (SV4 - Huy)
 * ==============================================================================
 * 1. GET  /api/v1/finance/wallet/me     : Số dư + lịch sử biến động ví của người đang đăng nhập.
 * 2. POST /api/v1/finance/wallet/topups : Tạo đơn nạp tiền, trả orderCode để chuyển sang /payment/{orderCode}.
 */
@RestController
@RequestMapping("/api/v1/finance/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;
    private final PaymentProcessingService paymentProcessingService;
    private final FinanceCurrentUser currentUser;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<WalletResponse>> getMyWallet(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Long userId = currentUser.require().userId();
        WalletResponse response = walletService.findByUserId(userId)
                .map(wallet -> WalletResponse.builder()
                        .balance(wallet.getBalance())
                        .currency("VND")
                        .entries(walletService.getEntries(wallet.getWalletId(), page, Math.min(size, 100))
                                .map(WalletResponse.Entry::fromEntity)
                                .getContent())
                        .build())
                .orElse(WalletResponse.builder().balance(BigDecimal.ZERO).currency("VND").entries(List.of()).build());
        return ResponseEntity.ok(ApiResponse.ok("Lấy thông tin ví thành công", response));
    }

    @PostMapping("/topups")
    public ResponseEntity<ApiResponse<OrderCreateResponse>> createTopUp(@Valid @RequestBody TopUpRequest request) {
        OrderCreateResponse response = paymentProcessingService.createTopUp(currentUser.require().userId(), request.getAmount());
        return ResponseEntity.ok(ApiResponse.ok("Tạo đơn nạp tiền thành công", response));
    }
}
