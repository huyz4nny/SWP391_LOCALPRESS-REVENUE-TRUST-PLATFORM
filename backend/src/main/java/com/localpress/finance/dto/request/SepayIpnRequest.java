package com.localpress.finance.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

/**
 * ==============================================================================
 * DTO: PAYLOAD WEBHOOK IPN TỪ CỔNG THANH TOÁN SEPAY (SV4 - UC049)
 * ==============================================================================
 * Hỗ trợ linh hoạt cả 2 định dạng webhook của SePay:
 * 1. Định dạng Cổng thanh toán (Payment Gateway): Có đối tượng `order` và `notification_type`.
 * 2. Định dạng Biến động số dư (Bank Hub): Có `content`, `amount`, `gateway`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SepayIpnRequest {

    // --- Định dạng Payment Gateway ---
    @JsonProperty("notification_type")
    private String notificationType;

    private Long timestamp;

    private OrderData order;

    // --- Định dạng Bank Hub ---
    private String gateway;

    private String content;

    @JsonProperty("transfer_type")
    private String transferType;

    private BigDecimal amount;

    @JsonProperty("reference_code")
    private String referenceCode;

    @JsonProperty("account_number")
    private String accountNumber;

    @JsonProperty("transaction_date")
    private String transactionDate;

    /**
     * Dữ liệu đơn hàng chi tiết trong SePay Payment Gateway
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OrderData {
        private String id;

        @JsonProperty("order_id")
        private String orderId;

        @JsonProperty("order_invoice_number")
        private String orderInvoiceNumber;

        @JsonProperty("order_status")
        private String orderStatus;

        @JsonProperty("order_amount")
        private BigDecimal orderAmount;

        @JsonProperty("order_currency")
        private String orderCurrency;

        @JsonProperty("order_description")
        private String orderDescription;
    }

    /**
     * Trích xuất mã đơn hàng thông minh từ một trong 2 định dạng.
     */
    public String resolveOrderCode() {
        if (order != null && order.getOrderInvoiceNumber() != null && !order.getOrderInvoiceNumber().isBlank()) {
            return order.getOrderInvoiceNumber().trim();
        }
        if (content != null && !content.isBlank()) {
            // Tìm mã đơn có định dạng ORD- hoặc LP- trong nội dung chuyển tiền
            String text = content.toUpperCase();
            for (String part : text.split("[\\s,;:-]+")) {
                if (part.startsWith("ORD") || part.startsWith("LP")) {
                    return part.replaceAll("[^A-Z0-9_-]", "");
                }
            }
            return content.trim();
        }
        return null;
    }

    /**
     * Trích xuất số tiền đã thanh toán.
     */
    public BigDecimal resolveAmount() {
        if (order != null && order.getOrderAmount() != null) {
            return order.getOrderAmount();
        }
        if (amount != null) {
            return amount;
        }
        return BigDecimal.ZERO;
    }
}
