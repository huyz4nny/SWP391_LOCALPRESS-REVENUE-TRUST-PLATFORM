package com.localpress.finance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.model.PaymentComplaint;
import com.localpress.finance.model.SepayWebhookLog;
import com.localpress.finance.repository.PaymentComplaintRepository;
import com.localpress.finance.repository.SepayWebhookLogRepository;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.finance.service.SepayGatewayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;
import com.localpress.shared.exception.AppException;
import com.sun.net.httpserver.HttpServer;

import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * UC048, UC049: nhận tiền từ SePay qua cổng duy nhất SepayGatewayService.
 * Payload mẫu lấy đúng định dạng webhook biến động số dư của SePay (field camelCase).
 */
class SepayGatewayServiceTest {

    private static final String ORDER = "LP2610211402AB12";
    private static final String REAL_PAYLOAD = """
            {"id":92704,"gateway":"Vietcombank","transactionDate":"2026-10-21 14:02:37",
             "accountNumber":"0123499999","code":null,"content":"CT DEN:0291 LP2610211402AB12 chuyen tien",
             "transferType":"in","transferAmount":15000,"accumulated":19077000,
             "subAccount":null,"referenceCode":"MBVCB.3278907687","description":""}
            """;

    private PaymentProcessingService processing;
    private SepayWebhookLogRepository logs;
    private PaymentComplaintRepository complaints;
    private SepayGatewayService gateway;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        processing = mock(PaymentProcessingService.class);
        logs = mock(SepayWebhookLogRepository.class);
        complaints = mock(PaymentComplaintRepository.class);
        when(complaints.findByBankReferenceAndStatus(any(), any())).thenReturn(Optional.empty());
        gateway = new SepayGatewayService(processing, logs, complaints, mapper);
    }

    @Test
    @DisplayName("Đọc đúng payload thật của SePay: số tiền, mã tham chiếu, id, mã đơn trong nội dung CK")
    void parsesRealSepayPayload() throws Exception {
        SepayIpnRequest ipn = mapper.readValue(REAL_PAYLOAD, SepayIpnRequest.class);

        assertThat(ipn.getSepayId()).isEqualTo(92704L);
        assertThat(ipn.resolveAmount()).isEqualByComparingTo("15000");
        assertThat(ipn.getReferenceCode()).isEqualTo("MBVCB.3278907687");
        assertThat(ipn.resolveOrderCode()).isEqualTo(ORDER);
        assertThat(ipn.isOutgoing()).isFalse();
    }

    @Test
    @DisplayName("Mã đơn dính chữ hoặc viết thường vẫn tìm được; chữ LPBANK không bị nhận nhầm")
    void findsOrderCodeInMessyContent() {
        assertThat(SepayIpnRequest.findOrderCode("lp2610211402ab12GD 123")).isEqualTo(ORDER);
        assertThat(SepayIpnRequest.findOrderCode("CK qua LPBANK cho ban")).isNull();
    }

    @Test
    @DisplayName("Lần đầu nhận: xử lý, ghi log có sepay_id, trả success=true cho SePay")
    void firstDeliveryIsProcessedAndLogged() throws Exception {
        SepayIpnRequest ipn = mapper.readValue(REAL_PAYLOAD, SepayIpnRequest.class);
        when(logs.existsBySepayId(92704L)).thenReturn(false);
        when(processing.processSepayIpn(any())).thenReturn(result(true, "SUCCESS"));

        SepayGatewayService.Outcome out = gateway.receive(SepayWebhookLog.Source.WEBHOOK, ipn, REAL_PAYLOAD, true, "1.2.3.4");

        assertThat(out.httpStatus()).isEqualTo(200);
        assertThat(out.body().get("success")).isEqualTo(true);
        ArgumentCaptor<SepayWebhookLog> saved = ArgumentCaptor.forClass(SepayWebhookLog.class);
        verify(logs).save(saved.capture());
        assertThat(saved.getValue().getSepayId()).isEqualTo(92704L);
        assertThat(saved.getValue().getResultStatus()).isEqualTo("SUCCESS");
        assertThat(saved.getValue().getRawPayload()).contains("MBVCB.3278907687");
    }

    @Test
    @DisplayName("SePay gửi lại cùng id: không xử lý lần 2, vẫn trả success=true để SePay ngừng gửi (Rule 5)")
    void duplicateDeliveryIsNotProcessedAgain() throws Exception {
        SepayIpnRequest ipn = mapper.readValue(REAL_PAYLOAD, SepayIpnRequest.class);
        when(logs.existsBySepayId(92704L)).thenReturn(true);

        SepayGatewayService.Outcome out = gateway.receive(SepayWebhookLog.Source.WEBHOOK, ipn, REAL_PAYLOAD, true, "1.2.3.4");

        assertThat(out.httpStatus()).isEqualTo(200);
        assertThat(out.body().get("status")).isEqualTo("ALREADY_PROCESSED");
        verify(processing, never()).processSepayIpn(any());
    }

    @Test
    @DisplayName("Không tìm thấy đơn: vẫn trả success=true (gửi lại vô ích), log ORDER_NOT_FOUND chờ kế toán")
    void orderNotFoundStillAcknowledged() throws Exception {
        SepayIpnRequest ipn = mapper.readValue(REAL_PAYLOAD, SepayIpnRequest.class);
        when(processing.processSepayIpn(any())).thenReturn(result(false, "ORDER_NOT_FOUND"));

        SepayGatewayService.Outcome out = gateway.receive(SepayWebhookLog.Source.WEBHOOK, ipn, REAL_PAYLOAD, true, "1.2.3.4");

        assertThat(out.httpStatus()).isEqualTo(200);
        assertThat(out.body().get("success")).isEqualTo(true);
        assertThat(out.body().get("status")).isEqualTo("ORDER_NOT_FOUND");
    }

    @Test
    @DisplayName("Sai khóa: 401, không xử lý, log không giữ sepay_id")
    void invalidKeyIsRejected() throws Exception {
        SepayIpnRequest ipn = mapper.readValue(REAL_PAYLOAD, SepayIpnRequest.class);

        SepayGatewayService.Outcome out = gateway.receive(SepayWebhookLog.Source.WEBHOOK, ipn, REAL_PAYLOAD, false, "6.6.6.6");

        assertThat(out.httpStatus()).isEqualTo(401);
        verify(processing, never()).processSepayIpn(any());
        ArgumentCaptor<SepayWebhookLog> saved = ArgumentCaptor.forClass(SepayWebhookLog.class);
        verify(logs).save(saved.capture());
        assertThat(saved.getValue().getSepayId()).isNull();
        assertThat(saved.getValue().isAuthOk()).isFalse();
    }

    @Test
    @DisplayName("Tiền ra khỏi tài khoản: bỏ qua, không đụng đơn nào")
    void outgoingTransferIgnored() {
        SepayIpnRequest ipn = SepayIpnRequest.builder().sepayId(5L).transferType("out")
                .amount(new BigDecimal("50000")).content(ORDER).build();

        SepayGatewayService.Outcome out = gateway.receive(SepayWebhookLog.Source.WEBHOOK, ipn, "{}", true, "1.2.3.4");

        assertThat(out.body().get("status")).isEqualTo("IGNORED_OUTGOING");
        verify(processing, never()).processSepayIpn(any());
    }

    private static Map<String, Object> result(boolean success, String status) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", success);
        m.put("status", status);
        m.put("orderCode", ORDER);
        m.put("message", status);
        return m;
    }

    @Test
    @DisplayName("Rule 5: webhook về sau khi kế toán đã ghi nhận cùng mã GD qua khiếu nại -> không xử lý lại")
    void referenceAlreadyRecordedByComplaintIsSkipped() throws Exception {
        SepayIpnRequest ipn = mapper.readValue(REAL_PAYLOAD, SepayIpnRequest.class);
        when(complaints.findByBankReferenceAndStatus("MBVCB.3278907687", PaymentComplaint.Status.RESOLVED))
                .thenReturn(Optional.of(PaymentComplaint.builder().complaintId(9L).bankReference("MBVCB.3278907687").build()));

        SepayGatewayService.Outcome out = gateway.receive(SepayWebhookLog.Source.WEBHOOK, ipn, REAL_PAYLOAD, true, "1.2.3.4");

        assertThat(out.httpStatus()).isEqualTo(200);
        assertThat(out.body().get("status")).isEqualTo(SepayWebhookLog.RECORDED_BY_COMPLAINT);
        verify(processing, never()).processSepayIpn(any());
        ArgumentCaptor<SepayWebhookLog> saved = ArgumentCaptor.forClass(SepayWebhookLog.class);
        verify(logs).save(saved.capture());
        assertThat(saved.getValue().getSepayId()).isEqualTo(92704L);
        assertThat(saved.getValue().getResultStatus()).isEqualTo(SepayWebhookLog.RECORDED_BY_COMPLAINT);
    }
    @Test
    @DisplayName("PAY-06: đồng bộ API SePay lấy hết cửa sổ thời gian khi có hơn 200 giao dịch (lùi transaction_date_max)")
    void syncPagesBackWhenMoreThanLimit() throws Exception {
        // 250 giao dịch tiền vào, id 1..250, id càng lớn càng mới; API trả mới nhất trước, tối đa limit dòng
        List<String> queries = new ArrayList<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/transactions/list", ex -> {
            String q = java.net.URLDecoder.decode(ex.getRequestURI().getRawQuery(), StandardCharsets.UTF_8);
            queries.add(q);
            String max = null;
            for (String part : q.split("&")) {
                if (part.startsWith("transaction_date_max=")) max = part.substring("transaction_date_max=".length());
            }
            StringBuilder rows = new StringBuilder();
            int emitted = 0;
            for (int id = 250; id >= 1 && emitted < 200; id--) {
                String date = String.format("2026-11-03 %02d:%02d:00", 8 + id / 60, id % 60);
                if (max != null && date.compareTo(max) > 0) continue;
                if (emitted++ > 0) rows.append(',');
                rows.append(String.format("{\"id\":%d,\"transaction_date\":\"%s\",\"amount_in\":\"15000.00\","
                        + "\"transaction_content\":\"CK %d\",\"reference_number\":\"REF%d\"}", id, date, id, id));
            }
            byte[] body = ("{\"status\":200,\"transactions\":[" + rows + "]}").getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(200, body.length);
            ex.getResponseBody().write(body);
            ex.close();
        });
        server.start();
        try {
            ReflectionTestUtils.setField(gateway, "apiToken", "token");
            ReflectionTestUtils.setField(gateway, "apiBaseUrl", "http://127.0.0.1:" + server.getAddress().getPort());
            when(processing.processSepayIpn(any())).thenReturn(new LinkedHashMap<>(Map.of("status", "ORDER_NOT_FOUND", "message", "x")));
            when(logs.existsBySepayId(any())).thenReturn(false);

            SepayGatewayService.SyncResult r = gateway.syncFromSepay(48, null);

            assertThat(queries).hasSize(2);
            assertThat(queries.get(1)).contains("transaction_date_max=");
            // 250 giao dịch khác nhau, trùng ở mốc max được lọc theo id
            assertThat(r.fetched()).isEqualTo(250);
            assertThat(r.processed()).isEqualTo(250);
            ArgumentCaptor<SepayIpnRequest> ipns = ArgumentCaptor.forClass(SepayIpnRequest.class);
            verify(processing, times(250)).processSepayIpn(ipns.capture());
            // xử lý từ cũ đến mới
            assertThat(ipns.getAllValues().get(0).getSepayId()).isEqualTo(1L);
            assertThat(ipns.getAllValues().get(249).getSepayId()).isEqualTo(250L);
        } finally {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("Nhật ký phân trang: lọc trọn ngày, giới hạn cỡ trang, từ ngày sau đến ngày thì báo lỗi")
    void searchLogsPagesAndFiltersByDay() {
        when(logs.search(any(), any(), any(), any())).thenReturn(new PageImpl<>(List.of(), PageRequest.of(1, 200), 450));

        SepayGatewayService.LogPage page = gateway.searchLogs(SepayWebhookLog.Source.WEBHOOK,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 10), 1, 5000);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(logs).search(eq(SepayWebhookLog.Source.WEBHOOK), eq(LocalDateTime.of(2026, 11, 1, 0, 0)),
                eq(LocalDateTime.of(2026, 11, 11, 0, 0)), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(200);
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(1);
        assertThat(page.total()).isEqualTo(450);
        assertThat(page.totalPages()).isEqualTo(3);

        assertThatThrownBy(() -> gateway.searchLogs(null, LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 1), 0, 50))
                .isInstanceOf(AppException.class);
    }
}
