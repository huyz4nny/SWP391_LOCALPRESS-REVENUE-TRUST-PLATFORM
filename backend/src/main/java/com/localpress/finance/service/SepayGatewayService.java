package com.localpress.finance.service;

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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * ==============================================================================
 * CỔNG VÀO DUY NHẤT CHO TIỀN TỪ SEPAY (SV4 - UC048, UC049)
 * ==============================================================================
 * Mọi khoản tiền SePay báo về đều đi qua receive():
 * - WEBHOOK : SePay gọi POST /api/v1/finance/webhook/sepay (cần URL công khai,
 * xem backend/scripts/sepay-tunnel.ps1).
 * - API_SYNC : (đã bỏ 16/11/2026, chỉ dùng webhook) giá trị cũ trong log vẫn
 * giữ để đọc lại; không sinh dòng mới.
 * - SIMULATION: nút giả lập trên trang thanh toán (chỉ profile dev), ghi log có
 * nhãn để không lẫn với tiền thật.
 * Mỗi lần nhận đều ghi 1 dòng sepay_webhook_logs kèm payload thô. sepay_id
 * UNIQUE nên cùng 1 giao dịch SePay
 * chỉ được xử lý 1 lần, dù SePay gửi lại nhiều lần.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SepayGatewayService {

    private final PaymentProcessingService paymentProcessingService;
    private final SepayWebhookLogRepository logRepository;
    private final PaymentComplaintRepository complaintRepository;

    @Value("${localpress.sepay.account-number:}")
    private String accountNumber;

    @Value("${localpress.sepay.webhook-api-key:}")
    private String webhookApiKey;

    // =========================================================================
    // NHẬN 1 KHOẢN TIỀN
    // =========================================================================

    public record Outcome(int httpStatus, Map<String, Object> body) {
    }

    /**
     * Xử lý 1 thông báo tiền vào và ghi log. Trả về HTTP status nên gửi lại cho
     * SePay:
     * 200 + success=true khi đã xử lý xong (kể cả không tìm thấy đơn: tiền chờ kế
     * toán đối soát, SePay gửi lại cũng vô ích),
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
            return new Outcome(401,
                    PaymentProcessingService.result(false, "INVALID_SIGNATURE", null, "Sai khóa xác thực webhook"));
        }

        Long sepayId = ipn.getSepayId();
        if (sepayId != null && logRepository.existsBySepayId(sepayId)) {
            String msg = "SePay gửi lại giao dịch #" + sepayId + ", đã xử lý trước đó nên bỏ qua (Rule 5)";
            save(entry.resultStatus("DUPLICATE_DELIVERY").resultMessage(msg).build());
            return new Outcome(200,
                    PaymentProcessingService.result(true, "ALREADY_PROCESSED", ipn.resolveOrderCode(), msg));
        }

        if (ipn.isOutgoing()) {
            save(entry.sepayId(sepayId).resultStatus("IGNORED_OUTGOING")
                    .resultMessage("Tiền ra khỏi tài khoản, không phải khách thanh toán").build());
            return new Outcome(200,
                    PaymentProcessingService.result(true, "IGNORED_OUTGOING", null, "Bỏ qua giao dịch tiền ra"));
        }

        // Kế toán đã ghi nhận đúng khoản này qua khiếu nại (UC051) trước khi webhook
        // về: không ghi lần 2 (Rule 5)
        String reference = ipn.getReferenceCode() == null ? null : ipn.getReferenceCode().trim().toUpperCase();
        if (reference != null && !reference.isEmpty()) {
            Optional<PaymentComplaint> recorded = complaintRepository
                    .findByBankReferenceAndStatus(reference, PaymentComplaint.Status.RESOLVED);
            if (recorded.isPresent()) {
                String msg = "Mã GD " + reference + " đã được ghi nhận qua khiếu nại #"
                        + recorded.get().getComplaintId() + ", bỏ qua để không ghi 2 lần";
                save(entry.sepayId(sepayId).resultStatus(SepayWebhookLog.RECORDED_BY_COMPLAINT).resultMessage(msg)
                        .build());
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
            return new Outcome(500, PaymentProcessingService.result(false, "ERROR", ipn.resolveOrderCode(),
                    "Lỗi xử lý, SePay sẽ gửi lại"));
        }

        String status = String.valueOf(result.get("status"));
        save(entry.sepayId(sepayId).resultStatus(status)
                .resultMessage(truncate(String.valueOf(result.get("message")), 500)).build());

        // SePay chỉ coi là giao thành công khi nhận {"success": true}; ORDER_NOT_FOUND
        // gửi lại cũng không khác
        Map<String, Object> response = new LinkedHashMap<>(result);
        response.put("success", true);
        return new Outcome(200, response);
    }

    // =========================================================================
    // XEM LOG & CẤU HÌNH (màn hình Nhật ký SePay)
    // =========================================================================

    /** Một trang nhật ký: items là các dòng của trang, total là tổng số dòng khớp bộ lọc. */
    public record LogPage(List<SepayWebhookLog> items, long total, int page, int size, int totalPages) {
    }

    /** Kích thước trang tối đa, để một lần tải không kéo cả bảng về. */
    static final int MAX_LOG_PAGE_SIZE = 200;

    /**
     * Phân trang nhật ký, mới nhất trước. from/to là ngày nhận (cả hai đều tính trọn ngày), null là không lọc.
     */
    public LogPage searchLogs(SepayWebhookLog.Source source, LocalDate from, LocalDate to, int page, int size) { // đọc từ db
        if (from != null && to != null && from.isAfter(to)) {
            throw new AppException("Từ ngày phải trước hoặc bằng đến ngày", HttpStatus.BAD_REQUEST);
        }
        PageRequest request = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, MAX_LOG_PAGE_SIZE)));
        Page<SepayWebhookLog> result = logRepository.search(source,
                from == null ? null : from.atStartOfDay(),
                to == null ? null : to.plusDays(1).atStartOfDay(),
                request);
        return new LogPage(result.getContent(), result.getTotalElements(), result.getNumber(), result.getSize(),
                result.getTotalPages());
    }

    public Map<String, Object> configStatus() {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("webhookKeyConfigured", webhookApiKey != null && !webhookApiKey.isBlank());
        s.put("accountNumber", mask(accountNumber));// CHE STK
        s.put("webhookPath", "/api/v1/finance/webhook/sepay");
        List<SepayWebhookLog> lastWebhook = logRepository
                .findBySourceOrderByReceivedAtDesc(SepayWebhookLog.Source.WEBHOOK, PageRequest.of(0, 1));
        s.put("lastWebhookAt", lastWebhook.isEmpty() ? null : lastWebhook.get(0).getReceivedAt()); // TÌM LẦN CUỐI NHẬN
                                                                                                   // WEBHOOK
        // Tổng tính trên toàn bảng, không phụ thuộc số dòng hay bộ lọc nguồn màn hình đang tải
        s.put("realTotal", logRepository.sumRecordedAmount(SepayWebhookLog.Source.SIMULATION));
        s.put("realCount", logRepository.countBySourceNotAndAuthOkTrue(SepayWebhookLog.Source.SIMULATION));
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

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    private static String mask(String acc) {
        if (acc == null || acc.length() < 4)
            return acc;
        return "****" + acc.substring(acc.length() - 4);
    }
}
