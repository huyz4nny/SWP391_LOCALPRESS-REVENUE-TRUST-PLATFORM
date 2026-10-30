package com.localpress.editorial;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.editorial.dto.EditorialCampaignDto;
import com.localpress.editorial.dto.RejectBookingRequest;
import com.localpress.editorial.dto.ReviewCreativeRequest;
import com.localpress.editorial.dto.SendQuotationRequest;
import com.localpress.editorial.service.EditorialAdvertisingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EditorialAdvertisingServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private ObjectMapper json;

    @InjectMocks
    private EditorialAdvertisingService service;

    // =========================================================================
    // 1. sendQuotation tests (Rule: Chỉ báo giá khi quotation_status <> ACCEPTED và payment_status = UNPAID)
    // =========================================================================

    @Test
    @DisplayName("sendQuotation: Ném 409 khi khách hàng đã chốt báo giá (quotation_status = ACCEPTED)")
    void sendQuotation_whenAlreadyAccepted_throwsConflict409() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(101L))).thenReturn(List.of(
                Map.of("campaign_id", 101L, "quotation_status", "ACCEPTED", "payment_status", "UNPAID", "status", "PENDING")
        ));

        SendQuotationRequest req = SendQuotationRequest.builder()
                .finalPrice(new BigDecimal("20000000"))
                .discountPercent(BigDecimal.ZERO)
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.sendQuotation(101L, req, "editor@localpress.vn"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("chấp nhận báo giá"));
        verify(jdbc, never()).update(startsWith("UPDATE ad_campaigns SET quoted_amount"), any(), any(), any(), any());
    }

    @Test
    @DisplayName("sendQuotation: Ném 409 khi booking đã thanh toán (payment_status = PAID)")
    void sendQuotation_whenPaid_throwsConflict409() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(102L))).thenReturn(List.of(
                Map.of("campaign_id", 102L, "quotation_status", "PENDING", "payment_status", "PAID", "status", "APPROVED")
        ));

        SendQuotationRequest req = SendQuotationRequest.builder()
                .finalPrice(new BigDecimal("15000000"))
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.sendQuotation(102L, req, "editor@localpress.vn"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("chờ thanh toán hoặc đã thanh toán"));
    }

    @Test
    @DisplayName("sendQuotation: Ném 409 khi booking đang chờ thanh toán (payment_status = PENDING)")
    void sendQuotation_whenPaymentPending_throwsConflict409() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(103L))).thenReturn(List.of(
                Map.of("campaign_id", 103L, "quotation_status", "PENDING", "payment_status", "PENDING", "status", "PENDING")
        ));

        SendQuotationRequest req = SendQuotationRequest.builder()
                .finalPrice(new BigDecimal("15000000"))
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.sendQuotation(103L, req, "editor@localpress.vn"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("chờ thanh toán hoặc đã thanh toán"));
    }

    @Test
    @DisplayName("sendQuotation: Ném 409 khi booking đã bị từ chối trước đó (status = REJECTED)")
    void sendQuotation_whenRejected_throwsConflict409() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(104L))).thenReturn(List.of(
                Map.of("campaign_id", 104L, "quotation_status", "REJECTED", "payment_status", "UNPAID", "status", "REJECTED")
        ));

        SendQuotationRequest req = SendQuotationRequest.builder()
                .finalPrice(new BigDecimal("10000000"))
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.sendQuotation(104L, req, "editor@localpress.vn"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("đã bị từ chối"));
    }

    // =========================================================================
    // 2. rejectBooking tests (Rule: Chặn khi payment_status = PENDING hoặc PAID)
    // =========================================================================

    @Test
    @DisplayName("rejectBooking: Ném 409 khi đơn đang chờ thanh toán (payment_status = PENDING)")
    void rejectBooking_whenPaymentPending_throwsConflict409() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(201L))).thenReturn(List.of(
                Map.of("campaign_id", 201L, "quotation_status", "ACCEPTED", "payment_status", "PENDING", "status", "PENDING")
        ));

        RejectBookingRequest req = RejectBookingRequest.builder()
                .reason("Hết chỗ")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.rejectBooking(201L, req, "editor@localpress.vn"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("quá trình thanh toán"));
        verify(jdbc, never()).update(startsWith("UPDATE ad_campaigns SET status = 'REJECTED'"), any(), any());
    }

    @Test
    @DisplayName("rejectBooking: Ném 409 khi đơn đã thanh toán hoàn tất (payment_status = PAID)")
    void rejectBooking_whenPaid_throwsConflict409() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(202L))).thenReturn(List.of(
                Map.of("campaign_id", 202L, "quotation_status", "ACCEPTED", "payment_status", "PAID", "status", "APPROVED")
        ));

        RejectBookingRequest req = RejectBookingRequest.builder()
                .reason("Lý do muộn")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.rejectBooking(202L, req, "editor@localpress.vn"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("đã thanh toán"));
    }

    @Test
    @DisplayName("rejectBooking: Ném 400 khi lý do từ chối để trống")
    void rejectBooking_whenReasonBlank_throwsBadRequest400() {
        RejectBookingRequest req = RejectBookingRequest.builder()
                .reason("   ")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.rejectBooking(203L, req, "editor@localpress.vn"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    // =========================================================================
    // 3. reviewCreative tests (Rule: Bắt buộc lý do khi reject, chặn khi campaign REJECTED)
    // =========================================================================

    @Test
    @DisplayName("reviewCreative: Ném 400 khi từ chối banner mà không nhập lý do")
    void reviewCreative_whenRejectWithoutNotes_throwsBadRequest400() {
        ReviewCreativeRequest req = ReviewCreativeRequest.builder()
                .approved(false)
                .notes("   ")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.reviewCreative(301L, req, "editor@localpress.vn"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("lý do từ chối banner"));
    }

    @Test
    @DisplayName("reviewCreative: Ném 409 khi duyệt banner của campaign đã bị REJECTED")
    void reviewCreative_whenCampaignRejected_throwsConflict409() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(302L))).thenReturn(List.of(
                Map.of("creative_id", 302L, "campaign_id", 10L, "version_number", 1, "campaign_status", "REJECTED")
        ));

        ReviewCreativeRequest req = ReviewCreativeRequest.builder()
                .approved(true)
                .notes("Hợp lệ")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.reviewCreative(302L, req, "editor@localpress.vn"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Chiến dịch đã bị từ chối"));
    }

    // =========================================================================
    // 4. resolveUserId tests (Rule: Ném 401/403 thay vì hardcode 3L)
    // =========================================================================

    @Test
    @DisplayName("sendQuotation: Ném 401 khi không có email người dùng")
    void sendQuotation_whenEmailNull_throwsUnauthorized401() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(401L))).thenReturn(List.of(
                Map.of("campaign_id", 401L, "quotation_status", "PENDING", "payment_status", "UNPAID", "status", "PENDING")
        ));

        SendQuotationRequest req = SendQuotationRequest.builder()
                .finalPrice(new BigDecimal("10000000"))
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.sendQuotation(401L, req, null));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    @DisplayName("sendQuotation: Ném 403 khi email không tìm thấy trong users")
    void sendQuotation_whenEmailNotFound_throwsForbidden403() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(402L))).thenReturn(List.of(
                Map.of("campaign_id", 402L, "quotation_status", "PENDING", "payment_status", "UNPAID", "status", "PENDING")
        ));
        when(jdbc.query(contains("SELECT user_id FROM users"), any(RowMapper.class), eq("unknown@test.com")))
                .thenReturn(List.of());

        SendQuotationRequest req = SendQuotationRequest.builder()
                .finalPrice(new BigDecimal("10000000"))
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.sendQuotation(402L, req, "unknown@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    // =========================================================================
    // 5. getCampaigns tests (Rule: Driver trả created_at/updated_at dạng LocalDateTime không bị ClassCastException)
    // =========================================================================

    @Test
    @DisplayName("getCampaigns: Xử lý đúng kiểu LocalDateTime từ MySQL Connector-J mà không bị ClassCastException")
    void getCampaigns_withLocalDateTimeFromDriver_parsesSuccessfully() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 10, 20, 10, 0, 0);
        LocalDateTime updatedAt = LocalDateTime.of(2026, 10, 25, 14, 30, 0);
        LocalDate startDate = LocalDate.of(2026, 11, 1);
        LocalDate endDate = LocalDate.of(2026, 11, 30);

        Map<String, Object> campaignRow = new HashMap<>();
        campaignRow.put("campaign_id", 1L);
        campaignRow.put("advertiser_id", 2L);
        campaignRow.put("slot_id", 3L);
        campaignRow.put("campaign_name", "Chiến dịch Tết 2027");
        campaignRow.put("start_date", startDate);
        campaignRow.put("end_date", endDate);
        campaignRow.put("quoted_amount", new BigDecimal("50000000"));
        campaignRow.put("accepted_amount", new BigDecimal("45000000"));
        campaignRow.put("status", "ACTIVE");
        campaignRow.put("slot_name", "Top Leaderboard");
        campaignRow.put("company_name", "Công ty ABC");
        campaignRow.put("created_at", createdAt);
        campaignRow.put("updated_at", updatedAt);

        when(jdbc.queryForList(contains("FROM ad_campaigns c"))).thenReturn(List.of(campaignRow));

        List<EditorialCampaignDto> campaigns = service.getCampaigns();

        assertNotNull(campaigns);
        assertEquals(1, campaigns.size());
        EditorialCampaignDto dto = campaigns.get(0);
        assertEquals("1", dto.getId());
        assertEquals("Chiến dịch Tết 2027", dto.getName());
        assertEquals(createdAt, dto.getCreatedAt());
        assertEquals(updatedAt, dto.getUpdatedAt());
        assertEquals(startDate, dto.getStartDate());
        assertEquals(endDate, dto.getEndDate());
        assertEquals(new BigDecimal("45000000"), dto.getTotalBudget());
    }

    @Test
    @DisplayName("getCampaigns: Xử lý đúng kiểu Timestamp và java.sql.Date mà không bị lỗi")
    void getCampaigns_withTimestampAndSqlDate_parsesSuccessfully() {
        Timestamp createdTs = Timestamp.valueOf("2026-09-29 14:38:38");
        Timestamp updatedTs = Timestamp.valueOf("2026-10-27 23:57:10");
        java.sql.Date startDate = java.sql.Date.valueOf("2026-10-01");
        java.sql.Date endDate = java.sql.Date.valueOf("2026-10-31");

        Map<String, Object> campaignRow = new HashMap<>();
        campaignRow.put("campaign_id", 2L);
        campaignRow.put("advertiser_id", 2L);
        campaignRow.put("slot_id", 3L);
        campaignRow.put("campaign_name", "Chiến dịch Thu");
        campaignRow.put("start_date", startDate);
        campaignRow.put("end_date", endDate);
        campaignRow.put("quoted_amount", new BigDecimal("20000000"));
        campaignRow.put("accepted_amount", null);
        campaignRow.put("status", "PENDING");
        campaignRow.put("slot_name", "Sidebar Slot");
        campaignRow.put("company_name", "Công ty XYZ");
        campaignRow.put("created_at", createdTs);
        campaignRow.put("updated_at", updatedTs);

        when(jdbc.queryForList(contains("FROM ad_campaigns c"))).thenReturn(List.of(campaignRow));

        List<EditorialCampaignDto> campaigns = service.getCampaigns();

        assertNotNull(campaigns);
        assertEquals(1, campaigns.size());
        EditorialCampaignDto dto = campaigns.get(0);
        assertEquals("2", dto.getId());
        assertEquals(createdTs.toLocalDateTime(), dto.getCreatedAt());
        assertEquals(updatedTs.toLocalDateTime(), dto.getUpdatedAt());
        assertEquals(startDate.toLocalDate(), dto.getStartDate());
        assertEquals(new BigDecimal("20000000"), dto.getTotalBudget());
    }
}
