package com.localpress.finance.service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Objects;

/**
 * ==============================================================================
 * DỊCH VỤ SEPAY (SV4): QR CHUYỂN KHOẢN + XÁC THỰC WEBHOOK
 * ==============================================================================
 * Luồng hiện tại: khách quét QR chuyển khoản (ghi mã đơn LP... vào nội dung), SePay báo về qua webhook.
 * 1. Sinh link ảnh VietQR (chuẩn Napas, img.vietqr.io) theo tài khoản nhận tiền cấu hình ở localpress.sepay.*.
 * 2. Xác thực header webhook "Authorization: Apikey <key>".
 * Không dùng cổng SePay PG (chuyển hướng sang trang SePay, ký HMAC): đã bỏ.
 */
@Service
@Slf4j
public class SePayService {

    // API Key cấu hình ở mục Webhook trên dashboard SePay, SePay gửi lại qua header "Authorization: Apikey <key>"
    @Value("${localpress.sepay.webhook-api-key:}")
    private String webhookApiKey;

    @Getter
    @Value("${localpress.sepay.bank-code:VCB}")
    private String bankCode;

    // Tên ngân hàng theo chuẩn img.vietqr.io (vd: vietcombank, mbbank, bidv)
    @Value("${localpress.sepay.bank-short-name:vietcombank}")
    private String bankShortName;

    @Getter
    @Value("${localpress.sepay.account-number:}")
    private String accountNumber;

    @Getter
    @Value("${localpress.sepay.account-name:}")
    private String accountName;

    /**
     * Sinh link ảnh VietQR trực tiếp để render lên modal hoặc nhúng vào trang checkout.
     */
    public String generateVietQrUrl(String orderCode, BigDecimal amount) {
        // Dùng chuẩn VietQR QuickLink, ngân hàng & số tài khoản lấy từ cấu hình localpress.sepay.*
        return String.format(
                "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s&accountName=%s",
                bankShortName, accountNumber, amount.longValue(),
                URLEncoder.encode(orderCode, StandardCharsets.UTF_8),
                URLEncoder.encode(Objects.toString(accountName, ""), StandardCharsets.UTF_8));
    }

    /**
     * Xác thực khóa từ Header IPN ("Authorization: Apikey <key>", "Bearer <key>" hoặc X-Secret-Key).
     * So sánh constant-time để không lộ khóa qua thời gian phản hồi. Chưa cấu hình khóa thì từ chối hết.
     */
    public boolean verifyIpnSecretKey(String headerSecretKey) {
        if (headerSecretKey == null || headerSecretKey.isBlank()) {
            return false;
        }
        String expected = webhookApiKey;
        if (expected == null || expected.isBlank()) {
            log.error("Chưa cấu hình localpress.sepay.webhook-api-key, từ chối mọi webhook.");
            return false;
        }
        String cleanKey = headerSecretKey.replaceFirst("(?i)^(Bearer|Apikey)\\s+", "").trim();
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                cleanKey.getBytes(StandardCharsets.UTF_8));
    }
}
