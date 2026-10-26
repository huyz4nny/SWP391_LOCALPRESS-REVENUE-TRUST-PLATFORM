package com.localpress.finance.service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ==============================================================================
 * DỊCH VỤ TÍCH HỢP CỔNG THANH TOÁN SEPAY (SV4 - SEPAY GATEWAY SERVICE)
 * ==============================================================================
 * Cung cấp:
 * 1. Khởi tạo trường dữ liệu và chữ ký số HMAC-SHA256 cho Cổng thanh toán SePay PG.
 * 2. Xác thực chữ ký số webhook IPN theo chuẩn bảo mật SePay.
 * 3. Sinh link ảnh VietQR chuẩn Napas 24/7 của Vietcombank.
 */
@Service
@Slf4j
public class SePayService {

    // Khóa bí mật không có giá trị mặc định trong code: cấp qua biến môi trường / application-*.yml.
    @Value("${localpress.sepay.merchant-id:}")
    private String merchantId;

    @Value("${localpress.sepay.secret-key:}")
    private String secretKey;

    // API Key cấu hình ở mục Webhook trên dashboard SePay, SePay gửi lại qua header "Authorization: Apikey <key>"
    @Value("${localpress.sepay.webhook-api-key:}")
    private String webhookApiKey;

    @Value("${localpress.sepay.env:sandbox}")
    private String env;

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

    private static final List<String> SIGNED_FIELD_NAMES = List.of(
            "merchant",
            "env",
            "operation",
            "payment_method",
            "order_amount",
            "currency",
            "order_invoice_number",
            "order_description",
            "customer_id",
            "agreement_id",
            "agreement_name",
            "agreement_type",
            "agreement_payment_frequency",
            "agreement_amount_per_payment",
            "success_url",
            "error_url",
            "cancel_url",
            "order_id"
    );

    /**
     * Lấy URL endpoint nộp form thanh toán SePay PG.
     */
    public String getCheckoutUrl() {
        return "sandbox".equalsIgnoreCase(env)
                ? "https://pay-sandbox.sepay.vn/v1/checkout/init"
                : "https://pay.sepay.vn/v1/checkout/init";
    }

    /**
     * Khởi tạo danh sách trường dữ liệu và tính toán chữ ký số HMAC-SHA256.
     * Tương thích 100% với hàm `initOneTimePaymentFields` của SePay PG SDK.
     */
    public Map<String, Object> buildOneTimePaymentFields(
            String orderInvoiceNumber,
            BigDecimal amount,
            String description,
            String successUrl,
            String errorUrl,
            String cancelUrl
    ) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("merchant", merchantId);
        fields.put("operation", "PURCHASE");
        fields.put("payment_method", "BANK_TRANSFER");
        fields.put("order_amount", amount.longValue());
        fields.put("currency", "VND");
        fields.put("order_invoice_number", orderInvoiceNumber);
        fields.put("order_description", description != null && !description.isBlank()
                ? description
                : "Thanh toan don hang " + orderInvoiceNumber);

        putIfPresent(fields, "success_url", successUrl);
        putIfPresent(fields, "error_url", errorUrl);
        putIfPresent(fields, "cancel_url", cancelUrl);

        fields.put("signature", signFields(fields));
        return fields;
    }

    /**
     * Thuật toán ký số HMAC-SHA256 theo đặc tả SePay:
     * Lọc các key trong `SIGNED_FIELD_NAMES`, format chuỗi `key=value`, nối bằng dấu phẩy `,`
     * và băm HMAC-SHA256 với secretKey, mã hóa Base64.
     */
    public String signFields(Map<String, Object> fields) {
        try {
            String dataToSign = SIGNED_FIELD_NAMES.stream()
                    .filter(key -> fields.get(key) != null)
                    .map(key -> key + "=" + fields.get(key))
                    .collect(Collectors.joining(","));
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            sha256Hmac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(sha256Hmac.doFinal(dataToSign.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            log.error("Lỗi khi tạo chữ ký HMAC-SHA256 cho SePay: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi mã hóa chữ ký số thanh toán", e);
        }
    }

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
        String expected = webhookApiKey != null && !webhookApiKey.isBlank() ? webhookApiKey : secretKey;
        if (expected == null || expected.isBlank()) {
            log.error("Chưa cấu hình localpress.sepay.webhook-api-key, từ chối mọi webhook.");
            return false;
        }
        String cleanKey = headerSecretKey.replaceFirst("(?i)^(Bearer|Apikey)\\s+", "").trim();
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                cleanKey.getBytes(StandardCharsets.UTF_8));
    }

    private static void putIfPresent(Map<String, Object> fields, String key, String value) {
        if (value != null && !value.isBlank()) {
            fields.put(key, value);
        }
    }
}
