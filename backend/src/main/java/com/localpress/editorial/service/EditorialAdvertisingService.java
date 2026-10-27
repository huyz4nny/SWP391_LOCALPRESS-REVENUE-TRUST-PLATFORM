package com.localpress.editorial.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.editorial.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Service xử lý các nghiệp vụ quảng cáo phía Tòa soạn (SV2 - Trọng Phan):
 * - Hàng chờ Booking & Báo giá (Màn II.2.3 UC016 & Màn II.2.5 UC018)
 * - Lịch tồn kho slot quảng cáo (Màn II.2.4 UC017)
 * - Kiểm duyệt Banner Creative & Phiên bản (Màn II.2.6 UC020, UC021, UC022)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EditorialAdvertisingService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    private static final String BOOKINGS_BASE_SQL =
            "SELECT c.campaign_id, c.advertiser_id, c.slot_id, c.campaign_name, c.start_date, c.end_date, " +
            "       c.quoted_amount, c.quote_version, c.quote_discount_percent, c.quote_notes, " +
            "       c.quotation_status, c.accepted_quote_version, c.accepted_amount, " +
            "       c.payment_status, c.status, c.rejection_reason, c.created_at, c.updated_at, " +
            "       c.contact_person, c.contact_phone, c.contact_email, " +
            "       s.slot_code, s.name AS slot_name, s.base_price, s.pricing_type, " +
            "       a.company_name " +
            "FROM ad_campaigns c " +
            "JOIN ad_slots s ON s.slot_id = c.slot_id " +
            "JOIN advertisers a ON a.advertiser_id = c.advertiser_id ";

    // =========================================================================
    // UC016 & UC018: BOOKING QUEUE & QUOTATION MANAGEMENT
    // =========================================================================

    /**
     * Lấy toàn bộ danh sách booking quảng cáo cho tòa soạn kiểm duyệt.
     */
    public List<EditorialBookingDto> getBookings() {
        return jdbc.query(BOOKINGS_BASE_SQL + "ORDER BY c.campaign_id DESC", this::mapBookingRow);
    }

    /**
     * Lấy chi tiết một booking quảng cáo theo ID.
     */
    public EditorialBookingDto getBookingById(Long id) {
        List<EditorialBookingDto> list = jdbc.query(
                BOOKINGS_BASE_SQL + "WHERE c.campaign_id = ?",
                this::mapBookingRow,
                id
        );
        if (list.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu booking #" + id);
        }
        return list.get(0);
    }

    /**
     * Gửi báo giá chính thức cho khách hàng doanh nghiệp (UC018).
     * Tăng số phiên bản quote_version, cập nhật giá đã giảm và ghi chú điều khoản.
     */
    @Transactional
    public EditorialBookingDto sendQuotation(Long id, SendQuotationRequest request, String editorEmail) {
        EditorialBookingDto existing = getBookingById(id);
        if ("REJECTED".equalsIgnoreCase(existing.getBookingStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể gửi báo giá cho booking đã bị từ chối");
        }

        int rows = jdbc.update(
                "UPDATE ad_campaigns SET " +
                "    quoted_amount = ?, " +
                "    quote_discount_percent = ?, " +
                "    quote_notes = ?, " +
                "    quote_version = quote_version + 1, " +
                "    quotation_status = 'PENDING', " +
                "    status = 'PENDING', " +
                "    updated_at = NOW() " +
                "WHERE campaign_id = ?",
                request.getFinalPrice(),
                request.getDiscountPercent() != null ? request.getDiscountPercent() : BigDecimal.ZERO,
                request.getQuotationNotes(),
                id
        );

        if (rows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy booking #" + id);
        }

        Long editorId = resolveUserId(editorEmail);
        logAudit(editorId, "SEND_QUOTATION", "AD_CAMPAIGN", id, Map.of(
                "finalPrice", request.getFinalPrice(),
                "discountPercent", request.getDiscountPercent() != null ? request.getDiscountPercent() : 0,
                "quotationNotes", request.getQuotationNotes() != null ? request.getQuotationNotes() : ""
        ));

        log.info("Editor {} sent quotation for booking #{}: price={}, discount={}%",
                editorId, id, request.getFinalPrice(), request.getDiscountPercent());
        return getBookingById(id);
    }

    /**
     * Từ chối booking quảng cáo kèm lý do (UC016).
     */
    @Transactional
    public EditorialBookingDto rejectBooking(Long id, RejectBookingRequest request, String editorEmail) {
        EditorialBookingDto existing = getBookingById(id);
        if ("CONFIRMED".equalsIgnoreCase(existing.getBookingStatus()) && "PAID".equalsIgnoreCase(existing.getPaymentStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể từ chối booking đã thanh toán hoàn tất");
        }

        int rows = jdbc.update(
                "UPDATE ad_campaigns SET " +
                "    status = 'REJECTED', " +
                "    quotation_status = 'REJECTED', " +
                "    rejection_reason = ?, " +
                "    updated_at = NOW() " +
                "WHERE campaign_id = ?",
                request.getReason(),
                id
        );

        if (rows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy booking #" + id);
        }

        Long editorId = resolveUserId(editorEmail);
        logAudit(editorId, "REJECT_BOOKING", "AD_CAMPAIGN", id, Map.of("reason", request.getReason()));

        log.info("Editor {} rejected booking #{}: reason={}", editorId, id, request.getReason());
        return getBookingById(id);
    }

    // =========================================================================
    // UC020, UC021, UC022: CAMPAIGN & CREATIVE REVIEW
    // =========================================================================

    /**
     * Lấy danh sách toàn bộ chiến dịch kèm danh sách các creative và chỉ số hiển thị.
     */
    public List<EditorialCampaignDto> getCampaigns() {
        String sql =
                "SELECT c.campaign_id, c.advertiser_id, c.slot_id, c.campaign_name, c.start_date, c.end_date, " +
                "       c.quoted_amount, c.accepted_amount, c.status, c.created_at, c.updated_at, " +
                "       s.name AS slot_name, a.company_name " +
                "FROM ad_campaigns c " +
                "JOIN ad_slots s ON s.slot_id = c.slot_id " +
                "JOIN advertisers a ON a.advertiser_id = c.advertiser_id " +
                "ORDER BY c.campaign_id DESC";

        return jdbc.query(sql, (rs, rowNum) -> {
            long campaignId = rs.getLong("campaign_id");
            List<EditorialCreativeDto> creatives = getCreativesByCampaignId(campaignId);

            // Quy tắc 8 (Rule 8): Bản APPROVED có version lớn nhất là bản đang active serving
            Integer activeVersion = null;
            for (EditorialCreativeDto cr : creatives) {
                if ("APPROVED".equalsIgnoreCase(cr.getStatus())) {
                    if (activeVersion == null || cr.getVersionNumber() > activeVersion) {
                        activeVersion = cr.getVersionNumber();
                    }
                }
            }

            for (EditorialCreativeDto cr : creatives) {
                cr.setActiveServing(activeVersion != null && cr.getVersionNumber() == activeVersion);
            }

            // Thống kê impressions, clicks, CTR
            long[] stats = jdbc.queryForObject(
                    "SELECT COALESCE(SUM(impressions), 0), COALESCE(SUM(clicks), 0) FROM ad_stats WHERE campaign_id = ?",
                    (srs, srow) -> new long[]{srs.getLong(1), srs.getLong(2)},
                    campaignId
            );
            long impressions = stats != null ? stats[0] : 0;
            long clicks = stats != null ? stats[1] : 0;
            BigDecimal ctr = impressions > 0
                    ? BigDecimal.valueOf(clicks * 100.0).divide(BigDecimal.valueOf(impressions), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            BigDecimal budget = rs.getBigDecimal("accepted_amount") != null
                    ? rs.getBigDecimal("accepted_amount")
                    : rs.getBigDecimal("quoted_amount");

            return EditorialCampaignDto.builder()
                    .id(String.valueOf(campaignId))
                    .bookingId(String.valueOf(campaignId))
                    .advertiserId(String.valueOf(rs.getLong("advertiser_id")))
                    .companyName(rs.getString("company_name"))
                    .slotId(String.valueOf(rs.getLong("slot_id")))
                    .slotName(rs.getString("slot_name"))
                    .name(rs.getString("campaign_name"))
                    .startDate(rs.getDate("start_date").toLocalDate())
                    .endDate(rs.getDate("end_date").toLocalDate())
                    .totalBudget(budget != null ? budget : BigDecimal.ZERO)
                    .status(rs.getString("status"))
                    .activeCreativeVersion(activeVersion)
                    .creatives(creatives)
                    .impressions(impressions)
                    .clicks(clicks)
                    .ctr(ctr)
                    .dailyStats(new ArrayList<>())
                    .createdAt(toLocalDateTime(rs.getTimestamp("created_at")))
                    .updatedAt(toLocalDateTime(rs.getTimestamp("updated_at")))
                    .build();
        });
    }

    /**
     * Lấy danh sách các bản banner/creative của một chiến dịch.
     */
    public List<EditorialCreativeDto> getCreativesByCampaignId(long campaignId) {
        String sql =
                "SELECT cr.creative_id, cr.campaign_id, cr.version_number, cr.title, cr.media_url, " +
                "       cr.target_url, cr.width, cr.height, cr.file_size_bytes, cr.review_status, " +
                "       cr.rejection_reason, cr.uploaded_at, cr.approved_at, u.full_name AS reviewer_name " +
                "FROM ad_creatives cr " +
                "LEFT JOIN users u ON u.user_id = cr.reviewed_by " +
                "WHERE cr.campaign_id = ? " +
                "ORDER BY cr.version_number DESC";

        return jdbc.query(sql, (rs, rowNum) -> {
            String reviewStatus = rs.getString("review_status");
            String mappedStatus = switch (reviewStatus != null ? reviewStatus.toUpperCase() : "PENDING") {
                case "APPROVED" -> "APPROVED";
                case "REJECTED" -> "REJECTED";
                case "PENDING" -> "IN_REVIEW";
                case "BLOCKED" -> "REJECTED";
                default -> reviewStatus;
            };

            int fileSizeKb = rs.getInt("file_size_bytes") > 0
                    ? rs.getInt("file_size_bytes") / 1024
                    : 150;

            return EditorialCreativeDto.builder()
                    .id(String.valueOf(rs.getLong("creative_id")))
                    .campaignId(String.valueOf(rs.getLong("campaign_id")))
                    .versionNumber(rs.getInt("version_number"))
                    .title(rs.getString("title") != null ? rs.getString("title") : "Banner v" + rs.getInt("version_number"))
                    .imageUrl(rs.getString("media_url"))
                    .targetUrl(rs.getString("target_url"))
                    .width(rs.getInt("width") > 0 ? rs.getInt("width") : null)
                    .height(rs.getInt("height") > 0 ? rs.getInt("height") : null)
                    .fileSizeKb(fileSizeKb)
                    .status(mappedStatus)
                    .reviewNotes(rs.getString("rejection_reason"))
                    .uploadedAt(toLocalDateTime(rs.getTimestamp("uploaded_at")))
                    .reviewedAt(toLocalDateTime(rs.getTimestamp("approved_at")))
                    .reviewedBy(rs.getString("reviewer_name"))
                    .isActiveServing(false)
                    .build();
        }, campaignId);
    }

    /**
     * Kiểm duyệt banner creative: Duyệt (APPROVED) hoặc Từ chối (REJECTED) (UC020).
     * Tuân thủ Rule 8: Bản duyệt mới nhất tự động được phục vụ phát sóng.
     */
    @Transactional
    public EditorialCreativeDto reviewCreative(Long creativeId, ReviewCreativeRequest request, String editorEmail) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT cr.creative_id, cr.campaign_id, cr.version_number, cr.title, cr.media_url, " +
                "       cr.target_url, cr.width, cr.height, cr.file_size_bytes, c.status AS campaign_status " +
                "FROM ad_creatives cr " +
                "JOIN ad_campaigns c ON c.campaign_id = cr.campaign_id " +
                "WHERE cr.creative_id = ?",
                creativeId
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy banner creative #" + creativeId);
        }

        Map<String, Object> cr = rows.get(0);
        long campaignId = ((Number) cr.get("campaign_id")).longValue();
        int versionNumber = ((Number) cr.get("version_number")).intValue();
        Long editorId = resolveUserId(editorEmail);

        if (request.isApproved()) {
            jdbc.update(
                    "UPDATE ad_creatives SET " +
                    "    review_status = 'APPROVED', " +
                    "    rejection_reason = ?, " +
                    "    reviewed_by = ?, " +
                    "    approved_at = NOW() " +
                    "WHERE creative_id = ?",
                    request.getNotes(),
                    editorId,
                    creativeId
            );

            logAudit(editorId, "APPROVE_CREATIVE", "AD_CREATIVE", creativeId, Map.of(
                    "campaignId", campaignId,
                    "versionNumber", versionNumber,
                    "notes", request.getNotes() != null ? request.getNotes() : ""
            ));

            log.info("Editor {} approved creative #{} (version {}) for campaign #{}",
                    editorId, creativeId, versionNumber, campaignId);
        } else {
            jdbc.update(
                    "UPDATE ad_creatives SET " +
                    "    review_status = 'REJECTED', " +
                    "    rejection_reason = ?, " +
                    "    reviewed_by = ? " +
                    "WHERE creative_id = ?",
                    request.getNotes(),
                    editorId,
                    creativeId
            );

            logAudit(editorId, "REJECT_CREATIVE", "AD_CREATIVE", creativeId, Map.of(
                    "campaignId", campaignId,
                    "versionNumber", versionNumber,
                    "notes", request.getNotes() != null ? request.getNotes() : ""
            ));

            log.info("Editor {} rejected creative #{} (version {}) for campaign #{}: notes={}",
                    editorId, creativeId, versionNumber, campaignId, request.getNotes());
        }

        List<EditorialCreativeDto> all = getCreativesByCampaignId(campaignId);
        return all.stream()
                .filter(c -> String.valueOf(creativeId).equals(c.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR));
    }

    // =========================================================================
    // HELPER METHODS & ROW MAPPING
    // =========================================================================

    private EditorialBookingDto mapBookingRow(ResultSet rs, int rowNum) throws SQLException {
        LocalDate start = rs.getDate("start_date").toLocalDate();
        LocalDate end = rs.getDate("end_date").toLocalDate();
        long days = ChronoUnit.DAYS.between(start, end) + 1;

        BigDecimal basePrice = rs.getBigDecimal("base_price");
        String pricingType = rs.getString("pricing_type");
        BigDecimal standardPrice = switch (pricingType != null ? pricingType : "CPD") {
            case "CPD" -> basePrice != null ? basePrice.multiply(BigDecimal.valueOf(days)) : BigDecimal.ZERO;
            case "FLAT_FEE" -> basePrice != null ? basePrice : BigDecimal.ZERO;
            default -> basePrice != null ? basePrice : BigDecimal.ZERO;
        };

        int quoteVersion = rs.getInt("quote_version");
        String status = rs.getString("status");
        String quotationStatus = rs.getString("quotation_status");
        BigDecimal acceptedAmount = rs.getBigDecimal("accepted_amount");
        BigDecimal quotedAmount = rs.getBigDecimal("quoted_amount");

        BigDecimal finalPrice = acceptedAmount != null
                ? acceptedAmount
                : (quoteVersion > 0 && quotedAmount != null && quotedAmount.compareTo(BigDecimal.ZERO) > 0
                        ? quotedAmount
                        : standardPrice);

        String bookingStatus;
        if ("REJECTED".equalsIgnoreCase(status) || "REJECTED".equalsIgnoreCase(quotationStatus)) {
            bookingStatus = "REJECTED";
        } else if ("ACCEPTED".equalsIgnoreCase(quotationStatus)) {
            bookingStatus = "CONFIRMED";
        } else if (quoteVersion > 0) {
            bookingStatus = "QUOTED";
        } else {
            bookingStatus = "SUBMITTED";
        }

        String deliveryStatus = switch (status != null ? status : "DRAFT") {
            case "ACTIVE" -> "LIVE";
            case "SUSPENDED" -> "PAUSED";
            case "COMPLETED" -> "COMPLETED";
            default -> "NOT_STARTED";
        };

        long campaignId = rs.getLong("campaign_id");
        return EditorialBookingDto.builder()
                .id(String.valueOf(campaignId))
                .campaignId(String.valueOf(campaignId))
                .advertiserId(String.valueOf(rs.getLong("advertiser_id")))
                .companyName(rs.getString("company_name"))
                .contactPerson(rs.getString("contact_person"))
                .contactPhone(rs.getString("contact_phone"))
                .contactEmail(rs.getString("contact_email"))
                .slotId(String.valueOf(rs.getLong("slot_id")))
                .slotName(rs.getString("slot_name"))
                .slotCode(rs.getString("slot_code"))
                .startDate(start)
                .endDate(end)
                .daysCount(days)
                .standardPrice(standardPrice)
                .discountPercent(rs.getBigDecimal("quote_discount_percent"))
                .finalPrice(finalPrice)
                .quotationNotes(rs.getString("quote_notes"))
                .rejectionReason(rs.getString("rejection_reason"))
                .bookingStatus(bookingStatus)
                .paymentStatus(rs.getString("payment_status"))
                .deliveryStatus(deliveryStatus)
                .termsAccepted("ACCEPTED".equalsIgnoreCase(quotationStatus))
                .createdAt(toLocalDateTime(rs.getTimestamp("created_at")))
                .updatedAt(toLocalDateTime(rs.getTimestamp("updated_at")))
                .build();
    }

    private Long resolveUserId(String email) {
        if (email == null || email.isBlank()) {
            return 3L; // Mặc định Biên tập viên SV2 (Nguyễn Văn Biên Tập) trong seed_data.sql
        }
        try {
            return jdbc.queryForObject(
                    "SELECT user_id FROM users WHERE email = ?",
                    Long.class,
                    email
            );
        } catch (Exception e) {
            return 3L;
        }
    }

    private void logAudit(Long userId, String action, String targetType, Long targetId, Object detail) {
        try {
            jdbc.update(
                    "INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, NOW())",
                    userId, action, targetType, targetId, json.writeValueAsString(detail)
            );
        } catch (Exception e) {
            log.warn("Failed to write audit log for action {}: {}", action, e.getMessage());
        }
    }

    private static LocalDateTime toLocalDateTime(Timestamp ts) {
        return ts != null ? ts.toLocalDateTime() : null;
    }
}
