package com.localpress.finance.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ==============================================================================
 * DTO: PAYLOAD WEBHOOK IPN TỪ SEPAY (SV4 - UC049)
 * ==============================================================================
 * Webhook biến động số dư của SePay (https://docs.sepay.vn/tich-hop-webhooks.html) gửi field camelCase:
 * {
 *   "id": 92704, "gateway": "Vietcombank", "transactionDate": "2026-10-21 14:02:37",
 *   "accountNumber": "0123499999", "code": "LP2610211402AB12", "content": "LP2610211402AB12 chuyen tien",
 *   "transferType": "in", "transferAmount": 15000, "accumulated": 19077000,
 *   "subAccount": null, "referenceCode": "MBVCB.3278907687", "description": ""
 * }
 * - id: id giao dịch phía SePay, dùng để chống xử lý trùng (SePay gửi lại tối đa 7 lần).
 * - code: mã thanh toán SePay tự nhận diện theo tiền tố cấu hình ở dashboard (ở đây là "LP").
 * Tên snake_case cũ (amount, transfer_type, reference_code...) vẫn đọc được qua @JsonAlias để không vỡ test cũ.
 * Định dạng Cổng thanh toán (có object "order") vẫn được hỗ trợ.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SepayIpnRequest {

    /** Mã đơn LocalPress: "LP" + yyMMddHHmm + 4 ký tự chữ/số (xem PaymentProcessingService.generateOrderCode). */
    private static final Pattern ORDER_CODE = Pattern.compile("LP\\d{10}[A-Z0-9]{4}");

    // --- Định dạng Payment Gateway ---
    @JsonProperty("notification_type")
    private String notificationType;

    private Long timestamp;

    private OrderData order;

    // --- Định dạng webhook biến động số dư (Bank Hub) ---
    /** Id giao dịch phía SePay. */
    @JsonProperty("id")
    private Long sepayId;

    private String gateway;

    @JsonProperty("transactionDate")
    @JsonAlias("transaction_date")
    private String transactionDate;

    @JsonProperty("accountNumber")
    @JsonAlias("account_number")
    private String accountNumber;

    @JsonProperty("subAccount")
    @JsonAlias("sub_account")
    private String subAccount;

    /** Mã thanh toán SePay nhận diện được trong nội dung CK (có thể null). */
    private String code;

    private String content;

    /** "in" = tiền vào, "out" = tiền ra. */
    @JsonProperty("transferType")
    @JsonAlias("transfer_type")
    private String transferType;

    @JsonProperty("transferAmount")
    @JsonAlias({"amount", "transfer_amount"})
    private BigDecimal amount;

    private BigDecimal accumulated;

    @JsonProperty("referenceCode")
    @JsonAlias("reference_code")
    private String referenceCode;

    private String description;

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

    /** Tiền ra khỏi tài khoản (vd: chủ tài khoản chuyển đi) thì bỏ qua, không phải khách trả tiền. */
    public boolean isOutgoing() {
        return transferType != null && "out".equalsIgnoreCase(transferType.trim());
    }

    /**
     * Tìm mã đơn theo thứ tự: số hóa đơn (Payment Gateway) -> "code" SePay nhận diện -> nội dung CK -> mô tả.
     * Ngân hàng có thể viết hoa, dính chữ hoặc thêm tiền tố vào nội dung, nên dò bằng regex thay vì tách từ.
     */
    public String resolveOrderCode() {
        if (order != null && order.getOrderInvoiceNumber() != null && !order.getOrderInvoiceNumber().isBlank()) {
            return order.getOrderInvoiceNumber().trim();
        }
        for (String text : new String[]{code, content, description}) {
            String found = findOrderCode(text);
            if (found != null) return found;
        }
        // Mã đơn ngoài định dạng LP (dữ liệu cũ, khiếu nại nhập tay): chỉ nhận khi cả chuỗi là 1 mã duy nhất
        if (code != null && !code.isBlank()) return code.trim();
        if (content != null && content.trim().matches("[A-Za-z0-9_-]+")) return content.trim();
        return null;
    }

    public static String findOrderCode(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher m = ORDER_CODE.matcher(text.toUpperCase().replaceAll("\\s+", " "));
        return m.find() ? m.group() : null;
    }

    public BigDecimal resolveAmount() {
        if (order != null && order.getOrderAmount() != null) {
            return order.getOrderAmount();
        }
        return amount != null ? amount : BigDecimal.ZERO;
    }
}
