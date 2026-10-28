package com.localpress.editorial;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.editorial.controller.EditorialAdvertisingController;
import com.localpress.editorial.dto.*;
import com.localpress.editorial.service.EditorialAdvertisingService;
import com.localpress.shared.security.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EditorialAdvertisingController.class)
@Import(SecurityConfig.class)
class EditorialAdvertisingControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EditorialAdvertisingService advertisingService;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("GET /editorial/bookings yêu cầu role EDITOR hoặc STAFF, từ chối READER 403")
    @WithMockUser(roles = "READER")
    void getBookings_forbiddenForReader() throws Exception {
        mvc.perform(get("/api/v1/editorial/bookings"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /editorial/bookings trả về danh sách bọc trong ApiResponse")
    @WithMockUser(roles = "EDITOR")
    void getBookings_returnsListInApiResponse() throws Exception {
        EditorialBookingDto booking = EditorialBookingDto.builder()
                .id("101")
                .advertiserId("1")
                .companyName("Công ty Cảng Đình Vũ")
                .campaignId("101")
                .slotId("1")
                .slotName("Banner Trang chủ Top")
                .slotCode("HOME_HEADER_DESKTOP")
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 7))
                .daysCount(7)
                .standardPrice(new BigDecimal("35000000.00"))
                .finalPrice(new BigDecimal("35000000.00"))
                .bookingStatus("SUBMITTED")
                .paymentStatus("UNPAID")
                .deliveryStatus("NOT_STARTED")
                .createdAt(LocalDateTime.now())
                .build();

        when(advertisingService.getBookings()).thenReturn(List.of(booking));

        mvc.perform(get("/api/v1/editorial/bookings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("101"))
                .andExpect(jsonPath("$.data[0].companyName").value("Công ty Cảng Đình Vũ"))
                .andExpect(jsonPath("$.data[0].bookingStatus").value("SUBMITTED"));
    }

    @Test
    @DisplayName("POST /editorial/bookings/{id}/quote gửi báo giá cập nhật thành công")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void sendQuotation_success() throws Exception {
        EditorialBookingDto updated = EditorialBookingDto.builder()
                .id("101")
                .bookingStatus("QUOTED")
                .finalPrice(new BigDecimal("31500000.00"))
                .discountPercent(new BigDecimal("10.00"))
                .quotationNotes("Giảm 10% tri ân khách hàng thân thiết")
                .build();

        when(advertisingService.sendQuotation(eq(101L), any(SendQuotationRequest.class), anyString()))
                .thenReturn(updated);

        SendQuotationRequest req = SendQuotationRequest.builder()
                .finalPrice(new BigDecimal("31500000.00"))
                .discountPercent(new BigDecimal("10.00"))
                .quotationNotes("Giảm 10% tri ân khách hàng thân thiết")
                .build();

        mvc.perform(post("/api/v1/editorial/bookings/101/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingStatus").value("QUOTED"))
                .andExpect(jsonPath("$.data.finalPrice").value(31500000.00));
    }

    @Test
    @DisplayName("POST /editorial/bookings/{id}/reject từ chối booking kèm lý do")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void rejectBooking_success() throws Exception {
        EditorialBookingDto rejected = EditorialBookingDto.builder()
                .id("101")
                .bookingStatus("REJECTED")
                .rejectionReason("Vị trí này đang bảo trì hệ thống hiển thị")
                .build();

        when(advertisingService.rejectBooking(eq(101L), any(RejectBookingRequest.class), anyString()))
                .thenReturn(rejected);

        RejectBookingRequest req = RejectBookingRequest.builder()
                .reason("Vị trí này đang bảo trì hệ thống hiển thị")
                .build();

        mvc.perform(post("/api/v1/editorial/bookings/101/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingStatus").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectionReason").value("Vị trí này đang bảo trì hệ thống hiển thị"));
    }

    @Test
    @DisplayName("GET /editorial/campaigns trả về danh sách chiến dịch kèm creatives")
    @WithMockUser(roles = "EDITOR")
    void getCampaigns_success() throws Exception {
        EditorialCreativeDto creative = EditorialCreativeDto.builder()
                .id("501")
                .campaignId("101")
                .versionNumber(1)
                .title("Banner v1")
                .imageUrl("https://example.com/banner.png")
                .targetUrl("https://dinhvuport.com.vn")
                .status("APPROVED")
                .isActiveServing(true)
                .build();

        EditorialCampaignDto campaign = EditorialCampaignDto.builder()
                .id("101")
                .name("Chiến dịch Logistics 2026")
                .companyName("Công ty Cảng Đình Vũ")
                .activeCreativeVersion(1)
                .creatives(List.of(creative))
                .impressions(125000)
                .clicks(3200)
                .ctr(new BigDecimal("2.56"))
                .build();

        when(advertisingService.getCampaigns()).thenReturn(List.of(campaign));

        mvc.perform(get("/api/v1/editorial/campaigns"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].name").value("Chiến dịch Logistics 2026"))
                .andExpect(jsonPath("$.data[0].activeCreativeVersion").value(1))
                .andExpect(jsonPath("$.data[0].creatives[0].isActiveServing").value(true));
    }

    @Test
    @DisplayName("POST /editorial/creatives/{id}/review-creative duyệt banner theo Rule 8")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void reviewCreative_approve_success() throws Exception {
        EditorialCreativeDto reviewed = EditorialCreativeDto.builder()
                .id("502")
                .campaignId("101")
                .versionNumber(2)
                .status("APPROVED")
                .reviewNotes("Banner đúng chuẩn kích thước và nội dung phù hợp")
                .isActiveServing(true)
                .build();

        when(advertisingService.reviewCreative(eq(502L), any(ReviewCreativeRequest.class), anyString()))
                .thenReturn(reviewed);

        ReviewCreativeRequest req = ReviewCreativeRequest.builder()
                .approved(true)
                .notes("Banner đúng chuẩn kích thước và nội dung phù hợp")
                .build();

        mvc.perform(post("/api/v1/editorial/creatives/502/review-creative")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.isActiveServing").value(true));
    }
}
