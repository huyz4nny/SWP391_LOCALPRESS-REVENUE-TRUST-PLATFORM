package com.localpress.editorial.controller;

import com.localpress.editorial.dto.*;
import com.localpress.editorial.service.EditorialAdvertisingService;
import com.localpress.shared.constant.AppConstants;
import com.localpress.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller cho các luồng quảng cáo phía Tòa soạn (SV2 - Trọng Phan):
 * - II.2.3: Hàng đợi tiếp nhận booking (Pending Booking Queue - UC016)
 * - II.2.5: Quản lý báo giá quảng cáo (Quotation Management - UC018)
 * - II.2.6: Kiểm duyệt Banner & Phiên bản (Creative Review - UC020, UC021, UC022)
 * - II.2.7: Thẩm định điều kiện phát sóng (Campaign Eligibility - UC022, UC023)
 * - II.2.8: Điều khiển vận hành chiến dịch (Campaign Control & Make-Good - UC023, UC024)
 * - II.2.9: Quản lý hợp đồng & Phân hạng VIP (Contract Management - UC019, UC025)
 * - II.2.10: Bảng điều khiển kinh doanh (Operations Dashboard - UC015, UC028)
 *
 * Base URL: /api/v1/editorial
 */
@RestController
@RequestMapping(AppConstants.API_V1_PREFIX + "/editorial")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('EDITOR', 'STAFF', 'SYSTEM_ADMIN', 'ADMIN')")
public class EditorialAdvertisingController {

    private final EditorialAdvertisingService advertisingService;

    // =========================================================================
    // UC016 & UC018: BOOKING QUEUE & QUOTATIONS
    // =========================================================================

    /**
     * GET /api/v1/editorial/bookings
     * Lấy toàn bộ danh sách booking quảng cáo cho tòa soạn.
     */
    @GetMapping("/bookings")
    public ResponseEntity<ApiResponse<List<EditorialBookingDto>>> getBookings() {
        List<EditorialBookingDto> list = advertisingService.getBookings();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách booking thành công", list));
    }

    /**
     * GET /api/v1/editorial/bookings/{id}
     * Lấy chi tiết một booking quảng cáo theo ID.
     */
    @GetMapping("/bookings/{id}")
    public ResponseEntity<ApiResponse<EditorialBookingDto>> getBookingById(@PathVariable("id") Long id) {
        EditorialBookingDto booking = advertisingService.getBookingById(id);
        return ResponseEntity.ok(ApiResponse.ok("Lấy chi tiết booking thành công", booking));
    }

    /**
     * POST /api/v1/editorial/bookings/{id}/quote
     * Gửi báo giá chính thức kèm chiết khấu và điều khoản kỹ thuật (UC018).
     */
    @PostMapping("/bookings/{id}/quote")
    public ResponseEntity<ApiResponse<EditorialBookingDto>> sendQuotation(
            @PathVariable("id") Long id,
            @Valid @RequestBody SendQuotationRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        EditorialBookingDto updated = advertisingService.sendQuotation(id, request, email);
        return ResponseEntity.ok(ApiResponse.ok("Gửi báo giá thành công", updated));
    }

    /**
     * POST /api/v1/editorial/bookings/{id}/reject
     * Từ chối booking kèm lý do (UC016).
     */
    @PostMapping("/bookings/{id}/reject")
    public ResponseEntity<ApiResponse<EditorialBookingDto>> rejectBooking(
            @PathVariable("id") Long id,
            @Valid @RequestBody RejectBookingRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        EditorialBookingDto updated = advertisingService.rejectBooking(id, request, email);
        return ResponseEntity.ok(ApiResponse.ok("Từ chối booking thành công", updated));
    }

    // =========================================================================
    // UC020, UC021, UC022: CAMPAIGN & CREATIVE REVIEW
    // =========================================================================

    /**
     * GET /api/v1/editorial/campaigns
     * Lấy danh sách chiến dịch kèm các bản banner creatives để kiểm duyệt.
     */
    @GetMapping("/campaigns")
    public ResponseEntity<ApiResponse<List<EditorialCampaignDto>>> getCampaigns() {
        List<EditorialCampaignDto> list = advertisingService.getCampaigns();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách chiến dịch thành công", list));
    }

    /**
     * POST /api/v1/editorial/creatives/{id}/review-creative
     * Kiểm duyệt banner creative: Duyệt (APPROVED) hoặc Từ chối (REJECTED).
     */
    @PostMapping("/creatives/{id}/review-creative")
    public ResponseEntity<ApiResponse<EditorialCreativeDto>> reviewCreative(
            @PathVariable("id") Long id,
            @Valid @RequestBody ReviewCreativeRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        EditorialCreativeDto updated = advertisingService.reviewCreative(id, request, email);
        return ResponseEntity.ok(ApiResponse.ok(
                request.isApproved() ? "Duyệt banner thành công" : "Từ chối banner thành công",
                updated
        ));
    }

    // =========================================================================
    // UC022 & UC023: AD SERVING GATEKEEPER (MÀN II.2.7)
    // =========================================================================

    /**
     * GET /api/v1/editorial/eligibility
     * Thẩm định 5 điều kiện tiên quyết kích hoạt quảng cáo (Rule 9).
     */
    @GetMapping("/eligibility")
    public ResponseEntity<ApiResponse<List<CampaignEligibilityDto>>> getEligibilityChecklist() {
        List<CampaignEligibilityDto> list = advertisingService.getEligibilityChecklist();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách thẩm định điều kiện phát sóng thành công", list));
    }

    /**
     * POST /api/v1/editorial/eligibility/{id}/activate
     * Kích hoạt phát sóng chiến dịch (LIVE).
     */
    @PostMapping("/eligibility/{id}/activate")
    public ResponseEntity<ApiResponse<CampaignEligibilityDto>> activateCampaign(
            @PathVariable("id") Long id,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        CampaignEligibilityDto updated = advertisingService.activateCampaign(id, email);
        return ResponseEntity.ok(ApiResponse.ok("Kích hoạt phát sóng chiến dịch thành công (LIVE)", updated));
    }

    // =========================================================================
    // UC023 & UC024: CAMPAIGN CONTROL (KILL-SWITCH & MAKE-GOOD - MÀN II.2.8)
    // =========================================================================

    /**
     * GET /api/v1/editorial/campaign-control
     * Lấy danh sách điều khiển chiến dịch.
     */
    @GetMapping("/campaign-control")
    public ResponseEntity<ApiResponse<List<CampaignControlDto>>> getCampaignControlList() {
        List<CampaignControlDto> list = advertisingService.getCampaignControlList();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách điều khiển chiến dịch thành công", list));
    }

    /**
     * POST /api/v1/editorial/campaign-control/{id}/suspend
     * Dừng khẩn cấp quảng cáo (Emergency Kill-Switch - UC024).
     */
    @PostMapping("/campaign-control/{id}/suspend")
    public ResponseEntity<ApiResponse<CampaignControlDto>> suspendCampaign(
            @PathVariable("id") Long id,
            @Valid @RequestBody SuspendCampaignRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        CampaignControlDto updated = advertisingService.suspendCampaign(id, request, email);
        return ResponseEntity.ok(ApiResponse.ok("Dừng khẩn cấp chiến dịch thành công (SUSPENDED)", updated));
    }

    /**
     * POST /api/v1/editorial/campaign-control/{id}/resume
     * Mở lại chiến dịch sau khi khắc phục vi phạm.
     */
    @PostMapping("/campaign-control/{id}/resume")
    public ResponseEntity<ApiResponse<CampaignControlDto>> resumeCampaign(
            @PathVariable("id") Long id,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        CampaignControlDto updated = advertisingService.resumeCampaign(id, email);
        return ResponseEntity.ok(ApiResponse.ok("Mở lại chiến dịch thành công (ACTIVE)", updated));
    }

    /**
     * POST /api/v1/editorial/campaign-control/{id}/make-good
     * Bù ngày phát sóng do sự cố gián đoạn (Make-Good Scheduling - UC024).
     */
    @PostMapping("/campaign-control/{id}/make-good")
    public ResponseEntity<ApiResponse<CampaignControlDto>> makeGoodCampaign(
            @PathVariable("id") Long id,
            @Valid @RequestBody MakeGoodRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        CampaignControlDto updated = advertisingService.makeGoodCampaign(id, request, email);
        return ResponseEntity.ok(ApiResponse.ok("Bù ngày phát sóng thành công", updated));
    }

    // =========================================================================
    // UC019 & UC025: ADVERTISING CONTRACT MANAGEMENT (MÀN II.2.9)
    // =========================================================================

    /**
     * GET /api/v1/editorial/contracts
     * Lấy danh sách hồ sơ hợp đồng quảng cáo B2B.
     */
    @GetMapping("/contracts")
    public ResponseEntity<ApiResponse<List<EditorialContractDto>>> getContracts() {
        List<EditorialContractDto> list = advertisingService.getContracts();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách hợp đồng thành công", list));
    }

    /**
     * PUT /api/v1/editorial/contracts/{id}
     * Cập nhật thông tin số hợp đồng và file PDF số hóa.
     */
    @PutMapping("/contracts/{id}")
    public ResponseEntity<ApiResponse<EditorialContractDto>> updateContract(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateContractRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        EditorialContractDto updated = advertisingService.updateContract(id, request, email);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật hợp đồng quảng cáo thành công", updated));
    }

    /**
     * POST /api/v1/editorial/contracts/{id}/addendum
     * Tạo mới phụ lục hợp đồng quảng cáo (UC019).
     */
    @PostMapping("/contracts/{id}/addendum")
    public ResponseEntity<ApiResponse<EditorialContractDto>> createAddendum(
            @PathVariable("id") Long id,
            @Valid @RequestBody CreateContractAddendumRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        EditorialContractDto updated = advertisingService.createAddendum(id, request, email);
        return ResponseEntity.ok(ApiResponse.ok("Tạo phụ lục hợp đồng thành công", updated));
    }

    /**
     * GET /api/v1/editorial/advertisers/vip
     * Lấy danh sách đối tác doanh nghiệp B2B và phân hạng VIP.
     */
    @GetMapping("/advertisers/vip")
    public ResponseEntity<ApiResponse<List<AdvertiserVipDto>>> getVipAdvertisers() {
        List<AdvertiserVipDto> list = advertisingService.getVipAdvertisers();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách phân hạng VIP doanh nghiệp thành công", list));
    }

    /**
     * PUT /api/v1/editorial/advertisers/{id}/vip-tier
     * Cập nhật phân hạng VIP và chiết khấu cho đối tác doanh nghiệp B2B.
     */
    @PutMapping("/advertisers/{id}/vip-tier")
    public ResponseEntity<ApiResponse<AdvertiserVipDto>> updateVipTier(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateVipTierRequest request,
            Authentication auth
    ) {
        String email = auth != null ? auth.getName() : null;
        AdvertiserVipDto updated = advertisingService.updateVipTier(id, request, email);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật phân hạng VIP thành công", updated));
    }

    // =========================================================================
    // UC015 & UC028: BUSINESS OPERATIONS DASHBOARD (MÀN II.2.10)
    // =========================================================================

    /**
     * GET /api/v1/editorial/dashboard/overview
     * Bảng điều khiển kinh doanh: Doanh thu kép B2B + B2C, Lấp đầy kho, Việc khẩn cấp.
     */
    @GetMapping("/dashboard/overview")
    public ResponseEntity<ApiResponse<EditorialDashboardDto>> getDashboardOverview() {
        EditorialDashboardDto overview = advertisingService.getDashboardOverview();
        return ResponseEntity.ok(ApiResponse.ok("Lấy dữ liệu bảng điều khiển kinh doanh thành công", overview));
    }
}
