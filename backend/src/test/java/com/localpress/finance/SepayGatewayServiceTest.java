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

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
}
