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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
                .contactPerson("Đặng Quang Huy")
                .slotId("1")
                .slotCode("SLOT-TOP-LEADERBOARD")
                .slotName("Leaderboard Đầu Trang")
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 7))
                .daysCount(7)
                .standardPrice(new BigDecimal("21000000"))
                .finalPrice(new BigDecimal("21000000"))
                .bookingStatus("SUBMITTED")
                .paymentStatus("UNPAID")
                .deliveryStatus("DRAFT")
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
    @DisplayName("POST /editorial/bookings/{id}/quote gửi báo giá thành công")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void sendQuotation_success() throws Exception {
        EditorialBookingDto quoted = EditorialBookingDto.builder()
                .id("101")
                .companyName("Công ty Cảng Đình Vũ")
                .finalPrice(new BigDecimal("18900000"))
                .discountPercent(new BigDecimal("10.00"))
                .quotationNotes("Chiết khấu đối tác thân thiết")
                .bookingStatus("QUOTED")
                .paymentStatus("UNPAID")
                .build();

        when(advertisingService.sendQuotation(eq(101L), any(SendQuotationRequest.class), anyString()))
                .thenReturn(quoted);

        SendQuotationRequest req = SendQuotationRequest.builder()
                .finalPrice(new BigDecimal("18900000"))
                .discountPercent(new BigDecimal("10.00"))
                .quotationNotes("Chiết khấu đối tác thân thiết")
                .build();

        mvc.perform(post("/api/v1/editorial/bookings/101/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingStatus").value("QUOTED"))
                .andExpect(jsonPath("$.data.finalPrice").value(18900000));
    }

    @Test
    @DisplayName("POST /editorial/bookings/{id}/quote validation thất bại khi giá âm")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void sendQuotation_validationNegativePrice() throws Exception {
        SendQuotationRequest req = SendQuotationRequest.builder()
                .finalPrice(new BigDecimal("-1000"))
                .build();

        mvc.perform(post("/api/v1/editorial/bookings/101/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /editorial/bookings/{id}/reject từ chối booking kèm lý do")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void rejectBooking_success() throws Exception {
        EditorialBookingDto rejected = EditorialBookingDto.builder()
                .id("101")
                .bookingStatus("REJECTED")
                .rejectionReason("Vị trí đã kín lịch")
                .build();

        when(advertisingService.rejectBooking(eq(101L), any(RejectBookingRequest.class), anyString()))
                .thenReturn(rejected);

        RejectBookingRequest req = RejectBookingRequest.builder()
                .reason("Vị trí đã kín lịch")
                .build();

        mvc.perform(post("/api/v1/editorial/bookings/101/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingStatus").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectionReason").value("Vị trí đã kín lịch"));
    }

    @Test
    @DisplayName("GET /editorial/campaigns trả về danh sách chiến dịch kèm creatives")
    @WithMockUser(roles = "EDITOR")
    void getCampaigns_returnsList() throws Exception {
        EditorialCreativeDto creative = EditorialCreativeDto.builder()
                .id("501")
                .versionNumber(1)
                .title("Banner v1")
                .imageUrl("https://example.com/banner1.jpg")
                .targetUrl("https://dinhvuport.com.vn")
                .status("APPROVED")
                .isActiveServing(true)
                .build();

        EditorialCampaignDto campaign = EditorialCampaignDto.builder()
                .id("101")
                .name("Chiến dịch Logistics 2026")
                .companyName("Công ty Cảng Đình Vũ")
                .slotName("Leaderboard Đầu Trang")
                .status("ACTIVE")
                .activeCreativeVersion(1)
                .creatives(List.of(creative))
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

    // =========================================================================
    // ITERATION 3 TESTS (Màn II.2.7 - II.2.10)
    // =========================================================================

    @Test
    @DisplayName("Màn II.2.7 (UC022, UC023): GET /editorial/eligibility trả về 5 điều kiện tiên quyết")
    @WithMockUser(roles = "EDITOR")
    void getEligibilityChecklist_returnsChecklist() throws Exception {
        CampaignEligibilityDto dto = CampaignEligibilityDto.builder()
                .campaignId(1L)
                .campaignName("Chiến dịch Logistics")
                .companyName("Công ty Cảng")
                .paymentPassed(true)
                .quotationPassed(true)
                .contractPassed(true)
                .creativePassed(true)
                .slotPassed(true)
                .overallEligible(true)
                .canActivate(false)
                .status("ACTIVE")
                .build();

        when(advertisingService.getEligibilityChecklist()).thenReturn(List.of(dto));

        mvc.perform(get("/api/v1/editorial/eligibility"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].overallEligible").value(true))
                .andExpect(jsonPath("$.data[0].paymentPassed").value(true))
                .andExpect(jsonPath("$.data[0].slotPassed").value(true));
    }

    @Test
    @DisplayName("Màn II.2.7: POST /editorial/eligibility/{id}/activate kích hoạt thành công")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void activateCampaign_success() throws Exception {
        CampaignEligibilityDto dto = CampaignEligibilityDto.builder()
                .campaignId(2L)
                .status("ACTIVE")
                .overallEligible(true)
                .canActivate(false)
                .build();

        when(advertisingService.activateCampaign(eq(2L), anyString())).thenReturn(dto);

        mvc.perform(post("/api/v1/editorial/eligibility/2/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("Màn II.2.8 (UC024): POST /editorial/campaign-control/{id}/suspend dừng khẩn cấp")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void suspendCampaign_success() throws Exception {
        CampaignControlDto dto = CampaignControlDto.builder()
                .campaignId(1L)
                .status("SUSPENDED")
                .suspensionReason("Nghi ngờ link đích độc hại")
                .build();

        when(advertisingService.suspendCampaign(eq(1L), any(SuspendCampaignRequest.class), anyString()))
                .thenReturn(dto);

        SuspendCampaignRequest req = SuspendCampaignRequest.builder()
                .reason("Nghi ngờ link đích độc hại")
                .build();

        mvc.perform(post("/api/v1/editorial/campaign-control/1/suspend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SUSPENDED"))
                .andExpect(jsonPath("$.data.suspensionReason").value("Nghi ngờ link đích độc hại"));
    }

    @Test
    @DisplayName("Màn II.2.8: POST /editorial/campaign-control/{id}/make-good bù ngày phát sóng")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void makeGoodCampaign_success() throws Exception {
        CampaignControlDto dto = CampaignControlDto.builder()
                .campaignId(1L)
                .endDate(LocalDate.of(2026, 10, 5))
                .makeGoodDaysAdded(3)
                .build();

        when(advertisingService.makeGoodCampaign(eq(1L), any(MakeGoodRequest.class), anyString()))
                .thenReturn(dto);

        MakeGoodRequest req = MakeGoodRequest.builder()
                .extraDays(3)
                .reason("Bù ngày do dừng kiểm tra kỹ thuật")
                .build();

        mvc.perform(post("/api/v1/editorial/campaign-control/1/make-good")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.makeGoodDaysAdded").value(3));
    }

    @Test
    @DisplayName("Màn II.2.9 (UC019): GET /editorial/contracts trả về danh sách hợp đồng")
    @WithMockUser(roles = "EDITOR")
    void getContracts_success() throws Exception {
        EditorialContractDto dto = EditorialContractDto.builder()
                .campaignId(1L)
                .companyName("Công ty Cảng Đình Vũ")
                .contractReference("HD-2026-DV-001")
                .contractValue(new BigDecimal("45000000"))
                .build();

        when(advertisingService.getContracts()).thenReturn(List.of(dto));

        mvc.perform(get("/api/v1/editorial/contracts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].contractReference").value("HD-2026-DV-001"));
    }

    @Test
    @DisplayName("Màn II.2.9: PUT /editorial/contracts/{id} cập nhật số hợp đồng")
    @WithMockUser(username = "editor@localpress.vn", roles = "EDITOR")
    void updateContract_success() throws Exception {
        EditorialContractDto dto = EditorialContractDto.builder()
                .campaignId(1L)
                .contractReference("HD-2026-DV-002")
                .contractFileUrl("https://example.com/contract.pdf")
                .build();

        when(advertisingService.updateContract(eq(1L), any(UpdateContractRequest.class), anyString()))
                .thenReturn(dto);

        UpdateContractRequest req = UpdateContractRequest.builder()
                .contractReference("HD-2026-DV-002")
                .contractFileUrl("https://example.com/contract.pdf")
                .build();

        mvc.perform(put("/api/v1/editorial/contracts/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.contractReference").value("HD-2026-DV-002"));
    }

    @Test
    @DisplayName("Màn II.2.10 (UC015, UC028): GET /editorial/dashboard/overview trả về dữ liệu doanh thu kép")
    @WithMockUser(roles = "EDITOR")
    void getDashboardOverview_success() throws Exception {
        EditorialDashboardDto dto = EditorialDashboardDto.builder()
                .b2bTotalSigned(new BigDecimal("100000000"))
                .b2bActualPaid(new BigDecimal("80000000"))
                .b2bReceivables(new BigDecimal("20000000"))
                .b2cSubscriptions(new BigDecimal("5000000"))
                .b2cSingleArticles(new BigDecimal("2000000"))
                .totalPlatformRevenue(new BigDecimal("87000000"))
                .pendingArticlesCount(3)
                .pendingBookingsCount(2)
                .build();

        when(advertisingService.getDashboardOverview()).thenReturn(dto);

        mvc.perform(get("/api/v1/editorial/dashboard/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.b2bActualPaid").value(80000000))
                .andExpect(jsonPath("$.data.totalPlatformRevenue").value(87000000))
                .andExpect(jsonPath("$.data.pendingArticlesCount").value(3));
    }
}
