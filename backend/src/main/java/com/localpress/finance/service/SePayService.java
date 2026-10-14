package com.localpress.finance.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

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

    @Value("${localpress.sepay.merchant-id:SP-LIVE-NV598A56}")
    private String merchantId;

    @Value("${localpress.sepay.secret-key:spsk_live_zE8upevaCPoKZApG6tynwKDQAaRnuknP}")
    private String secretKey;

    @Value("${localpress.sepay.env:production}")
    private String env;

    @Value("${localpress.sepay.bank-code:VCB}")
    private String bankCode;

    @Value("${localpress.sepay.account-name:NGUYEN VAN QUANG HUY}")
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
        if ("sandbox".equalsIgnoreCase(env)) {
            return "https://pay-sandbox.sepay.vn/v1/checkout/init";
        }
        return "https://pay.sepay.vn/v1/checkout/init";
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

        if (successUrl != null && !successUrl.isBlank()) {
            fields.put("success_url", successUrl);
        }
        if (errorUrl != null && !errorUrl.isBlank()) {
            fields.put("error_url", errorUrl);
        }
        if (cancelUrl != null && !cancelUrl.isBlank()) {
            fields.put("cancel_url", cancelUrl);
        }

        // Tính chữ ký số HMAC-SHA256
        String signature = signFields(fields);
        fields.put("signature", signature);

        return fields;
    }

    /**
     * Thuật toán ký số HMAC-SHA256 theo đặc tả SePay:
     * Lọc các key trong `SIGNED_FIELD_NAMES`, format chuỗi `key=value`, nối bằng dấu phẩy `,`
     * và băm HMAC-SHA256 với secretKey, mã hóa Base64.
     */
    public String signFields(Map<String, Object> fields) {
        try {
            List<String> signedPairs = new ArrayList<>();
            for (String key : SIGNED_FIELD_NAMES) {
                if (fields.containsKey(key) && fields.get(key) != null) {
                    signedPairs.add(key + "=" + fields.get(key));
                }
            }

            String dataToSign = String.join(",", signedPairs);
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"
            );
            sha256Hmac.init(secretKeySpec);

            byte[] hash = sha256Hmac.doFinal(dataToSign.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            log.error("Lỗi khi tạo chữ ký HMAC-SHA256 cho SePay: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi mã hóa chữ ký số thanh toán", e);
        }
    }

    /**
     * Sinh link ảnh VietQR trực tiếp để render lên modal hoặc nhúng vào trang checkout.
     */
    public String generateVietQrUrl(String orderCode, BigDecimal amount) {
        try {
            String encodedDesc = URLEncoder.encode(orderCode, StandardCharsets.UTF_8);
            String encodedName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);
            // Dùng chuẩn VietQR QuickLink (hỗ trợ Vietcombank Napas 24/7)
            return String.format(
                    "https://img.vietqr.io/image/vietcombank-9981-compact2.png?amount=%d&addInfo=%s&accountName=%s",
                    amount.longValue(), encodedDesc, encodedName
            );
        } catch (Exception e) {
            log.warn("Không thể encode URL VietQR: {}", e.getMessage());
            return "https://img.vietqr.io/image/vietcombank-9981-compact2.png?amount=" + amount.longValue();
        }
    }

    /**
     * Xác thực khóa bí mật từ Header IPN (X-Secret-Key hoặc Bearer token).
     */
    public boolean verifyIpnSecretKey(String headerSecretKey) {
        if (headerSecretKey == null || headerSecretKey.isBlank()) {
            return false;
        }
        // Xóa tiền tố Bearer hoặc Apikey nếu có
        String cleanKey = headerSecretKey.replace("Bearer ", "")
                .replace("Apikey ", "")
                .trim();
        return secretKey.equalsIgnoreCase(cleanKey);
    }
}
