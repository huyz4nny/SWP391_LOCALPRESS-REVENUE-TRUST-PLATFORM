package com.localpress.finance.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.model.PaymentComplaint;
import com.localpress.finance.model.SepayWebhookLog;
import com.localpress.finance.repository.PaymentComplaintRepository;
import com.localpress.finance.repository.SepayWebhookLogRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ==============================================================================
 * CỔNG VÀO DUY NHẤT CHO TIỀN TỪ SEPAY (SV4 - UC048, UC049)
 * ==============================================================================
 * Mọi khoản tiền SePay báo về đều đi qua receive():
 *  - WEBHOOK   : SePay gọi POST /api/v1/finance/webhook/sepay (cần URL công khai, xem backend/scripts/sepay-tunnel.ps1).
 *  - API_SYNC  : LocalPress tự hỏi API SePay (my.sepay.vn/userapi/transactions/list) khi máy local không nhận được
 *                webhook. Dữ liệu vẫn lấy từ server SePay nên không vi phạm Rule 4.
 *  - SIMULATION: nút giả lập trên trang thanh toán (chỉ profile dev), ghi log có nhãn để không lẫn với tiền thật.
 * Mỗi lần nhận đều ghi 1 dòng sepay_webhook_logs kèm payload thô. sepay_id UNIQUE nên cùng 1 giao dịch SePay
 * chỉ được xử lý 1 lần, dù SePay gửi lại hay vừa nhận webhook vừa đồng bộ API.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SepayGatewayService {

    private static final DateTimeFormatter SEPAY_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    /** Một đơn chỉ được hỏi API SePay 1 lần mỗi 10 giây (nút "kiểm tra lại" của khách). */
    private static final long ORDER_CHECK_COOLDOWN_MS = 10_000;
    /** Số giao dịch tối đa lấy mỗi lần gọi API SePay. */
    private static final int SYNC_LIMIT = 200;
    /** Số lần gọi tối đa cho 1 lần đồng bộ (lùi mốc transaction_date_max), tức tối đa 5.000 giao dịch. */
    private static final int SYNC_MAX_PAGES = 25;
    /** Nút kiểm tra của khách: hỏi từ lúc tạo đơn lùi lại chừng này phút (lệch giờ máy chủ / ngân hàng). */
    private static final long ORDER_CHECK_LOOKBACK_MINUTES = 10;

    private final PaymentProcessingService paymentProcessingService;
    private final SepayWebhookLogRepository logRepository;
    private final PaymentComplaintRepository complaintRepository;
    private final ObjectMapper objectMapper;
    private final Map<String, Long> lastOrderCheck = new ConcurrentHashMap<>();

    @Value("${localpress.sepay.api-token:}")
    private String apiToken;

    @Value("${localpress.sepay.api-base-url:https://my.sepay.vn/userapi}")
    private String apiBaseUrl;

    @Value("${localpress.sepay.account-number:}")
    private String accountNumber;

    @Value("${localpress.sepay.webhook-api-key:}")
    private String webhookApiKey;

    // =========================================================================
    // NHẬN 1 KHOẢN TIỀN
    // =========================================================================

    public record Outcome(int httpStatus, Map<String, Object> body) {}

    /**
     * Xử lý 1 thông báo tiền vào và ghi log. Trả về HTTP status nên gửi lại cho SePay:
     * 200 + success=true khi đã xử lý xong (kể cả không tìm thấy đơn: tiền chờ kế toán đối soát, SePay gửi lại cũng vô ích),
     * 401 khi sai khóa, 500 khi lỗi bất ngờ để SePay tự gửi lại.
     */
    public Outcome receive(SepayWebhookLog.Source source, SepayIpnRequest ipn, String rawPayload,
                           boolean authOk, String remoteIp) {
        SepayWebhookLog.SepayWebhookLogBuilder entry = SepayWebhookLog.builder()
                .source(source)
                .authOk(authOk)
                .rawPayload(rawPayload)
                .remoteIp(remoteIp)
                .receivedAt(LocalDateTime.now());
        if (ipn != null) {
            entry.gateway(ipn.getGateway())
                    .accountNumber(ipn.getAccountNumber())
                    .transferType(ipn.getTransferType())
                    .transferAmount(ipn.resolveAmount())
                    .content(truncate(ipn.getContent(), 500))
                    .paymentCode(ipn.getCode())
                    .referenceCode(ipn.getReferenceCode())
                    .transactionDate(ipn.getTransactionDate())
                    .orderCode(ipn.resolveOrderCode());
        }

        if (!authOk || ipn == null) {
            // Không ghi sepay_id: kẻ giả mạo không được chiếm trước id của giao dịch thật
            save(entry.resultStatus("INVALID_SIGNATURE").resultMessage("Sai hoặc thiếu khóa xác thực webhook").build());
            return new Outcome(401, PaymentProcessingService.result(false, "INVALID_SIGNATURE", null, "Sai khóa xác thực webhook"));
        }

        Long sepayId = ipn.getSepayId();
        if (sepayId != null && logRepository.existsBySepayId(sepayId)) {
            String msg = "SePay gửi lại giao dịch #" + sepayId + ", đã xử lý trước đó nên bỏ qua (Rule 5)";
            save(entry.resultStatus("DUPLICATE_DELIVERY").resultMessage(msg).build());
            return new Outcome(200, PaymentProcessingService.result(true, "ALREADY_PROCESSED", ipn.resolveOrderCode(), msg));
        }

        if (ipn.isOutgoing()) {
            save(entry.sepayId(sepayId).resultStatus("IGNORED_OUTGOING").resultMessage("Tiền ra khỏi tài khoản, không phải khách thanh toán").build());
            return new Outcome(200, PaymentProcessingService.result(true, "IGNORED_OUTGOING", null, "Bỏ qua giao dịch tiền ra"));
        }

        // Kế toán đã ghi nhận đúng khoản này qua khiếu nại (UC051) trước khi webhook về: không ghi lần 2 (Rule 5)
        String reference = ipn.getReferenceCode() == null ? null : ipn.getReferenceCode().trim().toUpperCase();
        if (reference != null && !reference.isEmpty()) {
            Optional<PaymentComplaint> recorded = complaintRepository
                    .findByBankReferenceAndStatus(reference, PaymentComplaint.Status.RESOLVED);
            if (recorded.isPresent()) {
                String msg = "Mã GD " + reference + " đã được ghi nhận qua khiếu nại #"
                        + recorded.get().getComplaintId() + ", bỏ qua để không ghi 2 lần";
                save(entry.sepayId(sepayId).resultStatus(SepayWebhookLog.RECORDED_BY_COMPLAINT).resultMessage(msg).build());
                return new Outcome(200, PaymentProcessingService.result(true, SepayWebhookLog.RECORDED_BY_COMPLAINT,
                        ipn.resolveOrderCode(), msg));
            }
        }

        Map<String, Object> result;
        try {
            result = paymentProcessingService.processSepayIpn(ipn);
        } catch (RuntimeException e) {
            log.error("Lỗi xử lý tiền SePay #{}: {}", sepayId, e.getMessage(), e);
            // Không ghi sepay_id để lần SePay gửi lại được xử lý tiếp
            save(entry.resultStatus("ERROR").resultMessage(truncate(e.getMessage(), 500)).build());
            return new Outcome(500, PaymentProcessingService.result(false, "ERROR", ipn.resolveOrderCode(), "Lỗi xử lý, SePay sẽ gửi lại"));
        }

        String status = String.valueOf(result.get("status"));
        save(entry.sepayId(sepayId).resultStatus(status).resultMessage(truncate(String.valueOf(result.get("message")), 500)).build());

        // SePay chỉ coi là giao thành công khi nhận {"success": true}; ORDER_NOT_FOUND gửi lại cũng không khác
        Map<String, Object> response = new LinkedHashMap<>(result);
        response.put("success", true);
        return new Outcome(200, response);
    }

    // =========================================================================
    // HỎI API SEPAY (dự phòng khi không nhận được webhook)
    // =========================================================================

    public record SyncResult(int fetched, int processed, int skippedDuplicate, int ignored, List<Map<String, Object>> items) {}

    /**
     * Kéo giao dịch tiền vào trong {hours} giờ gần nhất từ API SePay rồi xử lý từng giao dịch chưa có trong log.
     * orderCode khác null: chỉ xử lý giao dịch có mã đơn đó trong nội dung chuyển khoản.
     */
    public SyncResult syncFromSepay(int hours, String orderCode) {
        int window = Math.max(1, Math.min(hours, 24 * 7));
        return syncFromSepay(LocalDateTime.now().minusHours(window), orderCode);
    }

    private SyncResult syncFromSepay(LocalDateTime since, String orderCode) {
        if (!apiTokenConfigured()) {
            throw new AppException("Chưa cấu hình localpress.sepay.api-token (tạo ở my.sepay.vn > Cấu hình công ty > API Access)",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }
        String from = since.format(SEPAY_TIME);

        // API trả mới nhất trước, mỗi lần tối đa SYNC_LIMIT dòng: lùi transaction_date_max về giao dịch cũ nhất
        // của trang trước để lấy hết cửa sổ thời gian (PAY-06). Mốc max tính cả 2 đầu nên lọc trùng theo id.
        Map<Long, JsonNode> byId = new LinkedHashMap<>();
        String max = null;
        boolean complete = false;
        int pages = 0;
        while (pages < SYNC_MAX_PAGES) {
            List<JsonNode> batch = fetchTransactions(from, max);
            pages++;
            batch.forEach(tx -> byId.putIfAbsent(tx.path("id").asLong(), tx));
            if (batch.size() < SYNC_LIMIT) {
                complete = true;
                break;
            }
            String oldest = text(batch.get(batch.size() - 1), "transaction_date");
            if (oldest == null || oldest.equals(max)) {
                break; // hơn SYNC_LIMIT giao dịch cùng 1 giây: không lùi mốc được nữa
            }
            max = oldest;
        }
        if (!complete) {
            log.warn("Đồng bộ SePay từ {} dừng sau {} lần gọi ({} giao dịch), có thể còn giao dịch cũ hơn chưa lấy",
                    from, pages, byId.size());
        }

        // Xử lý từ cũ đến mới để thứ tự ghi nhận đúng thời gian
        List<JsonNode> rows = new ArrayList<>(byId.values());
        rows.sort(Comparator.comparing((JsonNode tx) -> Objects.toString(text(tx, "transaction_date"), ""))
                .thenComparingLong(tx -> tx.path("id").asLong()));

        int processed = 0, duplicate = 0, ignored = 0;
        List<Map<String, Object>> items = new ArrayList<>();
        for (JsonNode tx : rows) {
            BigDecimal amountIn = decimal(tx.path("amount_in").asText("0"));
            if (amountIn.signum() <= 0) { ignored++; continue; }

            SepayIpnRequest ipn = SepayIpnRequest.builder()
                    .sepayId(tx.path("id").asLong())
                    .gateway(text(tx, "bank_brand_name"))
                    .accountNumber(text(tx, "account_number"))
                    .transactionDate(text(tx, "transaction_date"))
                    .content(text(tx, "transaction_content"))
                    .code(text(tx, "code"))
                    .referenceCode(text(tx, "reference_number"))
                    .subAccount(text(tx, "sub_account"))
                    .transferType("in")
                    .amount(amountIn)
                    .build();

            String found = ipn.resolveOrderCode();
            if (orderCode != null && !orderCode.equalsIgnoreCase(found)) continue;
            if (logRepository.existsBySepayId(ipn.getSepayId())) { duplicate++; continue; }

            Outcome outcome = receive(SepayWebhookLog.Source.API_SYNC, ipn, tx.toString(), true, "my.sepay.vn");
            processed++;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("sepayId", ipn.getSepayId());
            item.put("amount", amountIn);
            item.put("orderCode", found);
            item.put("status", outcome.body().get("status"));
            items.add(item);
        }
        log.info("Đồng bộ SePay từ {}: lấy {}, xử lý {}, trùng {}, bỏ qua {}", from, rows.size(), processed, duplicate, ignored);
        return new SyncResult(rows.size(), processed, duplicate, ignored, items);
    }

    /** 1 lần gọi GET /transactions/list: giao dịch từ {from} đến {max} (null = đến hiện tại), mới nhất trước. */
    private List<JsonNode> fetchTransactions(String from, String max) {
        JsonNode root;
        try {
            String json = RestClient.create(apiBaseUrl).get()
                    .uri(uri -> {
                        uri.path("/transactions/list")
                                .queryParam("transaction_date_min", from)
                                .queryParam("limit", SYNC_LIMIT);
                        if (max != null) {
                            uri.queryParam("transaction_date_max", max);
                        }
                        if (accountNumber != null && !accountNumber.isBlank()) {
                            uri.queryParam("account_number", accountNumber);
                        }
                        return uri.build();
                    })
                    .header("Authorization", "Bearer " + apiToken)
                    .header("Content-Type", "application/json")
                    .retrieve()
                    .body(String.class);
            root = objectMapper.readTree(json);
        } catch (RestClientException e) {
            throw new AppException("Không gọi được API SePay: " + e.getMessage(), HttpStatus.BAD_GATEWAY);
        } catch (Exception e) {
            throw new AppException("API SePay trả dữ liệu không đọc được", HttpStatus.BAD_GATEWAY);
        }
        List<JsonNode> rows = new ArrayList<>();
        root.path("transactions").forEach(rows::add);
        return rows;
    }

    /**
     * Nút "Tôi đã chuyển khoản, kiểm tra lại" của khách: hỏi API SePay đúng đơn này, từ lúc tạo đơn.
     * Chưa cấu hình token hoặc vừa hỏi trong 10 giây thì chỉ trả trạng thái hiện tại.
     */
    public Map<String, Object> checkOrderWithSepay(String orderCode, LocalDateTime orderCreatedAt) {
        if (!apiTokenConfigured()) {
            return Map.of("checked", false, "reason", "API_TOKEN_NOT_CONFIGURED");
        }
        // Khóa theo mã chuẩn hóa: viết hoa / thường khác nhau vẫn là 1 đơn, không lách được thời gian chờ
        String key = orderCode.trim().toUpperCase();
        long now = System.currentTimeMillis();
        lastOrderCheck.values().removeIf(t -> now - t >= ORDER_CHECK_COOLDOWN_MS);
        if (lastOrderCheck.putIfAbsent(key, now) != null) {
            return Map.of("checked", false, "reason", "TOO_SOON");
        }
        // Chỉ hỏi từ lúc tạo đơn: ít giao dịch hơn nên không bị giới hạn SYNC_LIMIT cắt mất khoản của khách
        LocalDateTime since = orderCreatedAt != null
                ? orderCreatedAt.minusMinutes(ORDER_CHECK_LOOKBACK_MINUTES)
                : LocalDateTime.now().minusHours(48);
        SyncResult r = syncFromSepay(since, key);
        return Map.of("checked", true, "found", r.processed(), "items", r.items());
    }

    // =========================================================================
    // XEM LOG & CẤU HÌNH (màn hình Nhật ký SePay)
    // =========================================================================

    public List<SepayWebhookLog> recentLogs(SepayWebhookLog.Source source, int limit) {
        PageRequest page = PageRequest.of(0, Math.max(1, Math.min(limit, 500)));
        return source == null
                ? logRepository.findAllByOrderByReceivedAtDesc(page)
                : logRepository.findBySourceOrderByReceivedAtDesc(source, page);
    }

    public Map<String, Object> configStatus() {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("webhookKeyConfigured", webhookApiKey != null && !webhookApiKey.isBlank());
        s.put("apiTokenConfigured", apiTokenConfigured());
        s.put("accountNumber", mask(accountNumber));
        s.put("webhookPath", "/api/v1/finance/webhook/sepay");
        List<SepayWebhookLog> lastWebhook = logRepository.findBySourceOrderByReceivedAtDesc(SepayWebhookLog.Source.WEBHOOK, PageRequest.of(0, 1));
        s.put("lastWebhookAt", lastWebhook.isEmpty() ? null : lastWebhook.get(0).getReceivedAt());
        return s;
    }

    // =========================================================================

    private void save(SepayWebhookLog entry) {
        try {
            logRepository.save(entry);
        } catch (DataIntegrityViolationException e) {
            // Hai lần gửi cùng sepay_id đến cùng lúc: lần sau vẫn được ghi, chỉ bỏ sepay_id
            entry.setSepayId(null);
            if (!"DUPLICATE_DELIVERY".equals(entry.getResultStatus())) {
                entry.setResultMessage(truncate("Gửi trùng đồng thời. " + entry.getResultMessage(), 500));
            }
            logRepository.save(entry);
        }
    }

    private boolean apiTokenConfigured() {
        return apiToken != null && !apiToken.isBlank();
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asText();
    }

    private static BigDecimal decimal(String s) {
        try {
            return new BigDecimal(s.trim());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    private static String mask(String acc) {
        if (acc == null || acc.length() < 4) return acc;
        return "****" + acc.substring(acc.length() - 4);
    }
}
