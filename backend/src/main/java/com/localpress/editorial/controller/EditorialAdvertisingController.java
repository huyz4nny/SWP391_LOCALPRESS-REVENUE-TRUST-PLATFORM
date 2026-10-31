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
}
