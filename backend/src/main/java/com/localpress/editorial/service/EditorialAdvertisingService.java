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
import java.util.*;

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
     * Dùng SELECT ... FOR UPDATE để khóa dòng chống race condition.
     * Chỉ cho phép báo giá khi quotation_status <> 'ACCEPTED' và payment_status = 'UNPAID'.
     * Không can thiệp status của campaign.
     */
    @Transactional
    public EditorialBookingDto sendQuotation(Long id, SendQuotationRequest request, String editorEmail) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT campaign_id, quotation_status, payment_status, status FROM ad_campaigns WHERE campaign_id = ? FOR UPDATE",
                id
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu booking #" + id);
        }

        Map<String, Object> campaign = rows.get(0);
        String quotationStatus = (String) campaign.get("quotation_status");
        String paymentStatus = (String) campaign.get("payment_status");
        String status = (String) campaign.get("status");

        if ("REJECTED".equalsIgnoreCase(status) || "REJECTED".equalsIgnoreCase(quotationStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể gửi báo giá cho booking đã bị từ chối");
        }
        if ("ACCEPTED".equalsIgnoreCase(quotationStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Khách hàng đã chấp nhận báo giá, không thể gửi lại báo giá mới");
        }
        if (!"UNPAID".equalsIgnoreCase(paymentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn booking đang chờ thanh toán hoặc đã thanh toán hoàn tất, không thể đổi báo giá");
        }

        jdbc.update(
                "UPDATE ad_campaigns SET " +
                "    quoted_amount = ?, " +
                "    quote_discount_percent = ?, " +
                "    quote_notes = ?, " +
                "    quote_version = quote_version + 1, " +
                "    quotation_status = 'PENDING', " +
                "    updated_at = NOW() " +
                "WHERE campaign_id = ?",
                request.getFinalPrice(),
                request.getDiscountPercent() != null ? request.getDiscountPercent() : BigDecimal.ZERO,
                request.getQuotationNotes(),
                id
        );

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
     * Dùng SELECT ... FOR UPDATE để khóa dòng.
     * Chặn từ chối khi payment_status là PENDING hoặc PAID.
     */
    @Transactional
    public EditorialBookingDto rejectBooking(Long id, RejectBookingRequest request, String editorEmail) {
        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập lý do từ chối booking");
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT campaign_id, quotation_status, payment_status, status FROM ad_campaigns WHERE campaign_id = ? FOR UPDATE",
                id
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu booking #" + id);
        }

        Map<String, Object> campaign = rows.get(0);
        String quotationStatus = (String) campaign.get("quotation_status");
        String paymentStatus = (String) campaign.get("payment_status");
        String status = (String) campaign.get("status");

        if ("REJECTED".equalsIgnoreCase(status) || "REJECTED".equalsIgnoreCase(quotationStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking này đã bị từ chối trước đó");
        }
        if ("PAID".equalsIgnoreCase(paymentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể từ chối booking đã thanh toán hoàn tất");
        }
        if ("PENDING".equalsIgnoreCase(paymentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn booking đang trong quá trình thanh toán, không thể từ chối");
        }

        jdbc.update(
                "UPDATE ad_campaigns SET " +
                "    status = 'REJECTED', " +
                "    quotation_status = 'REJECTED', " +
                "    rejection_reason = ?, " +
                "    updated_at = NOW() " +
                "WHERE campaign_id = ?",
                request.getReason().trim(),
                id
        );

        Long editorId = resolveUserId(editorEmail);
        logAudit(editorId, "REJECT_BOOKING", "AD_CAMPAIGN", id, Map.of("reason", request.getReason().trim()));

        log.info("Editor {} rejected booking #{}: reason={}", editorId, id, request.getReason().trim());
        return getBookingById(id);
    }

    // =========================================================================
    // UC020, UC021, UC022: CAMPAIGN & CREATIVE REVIEW
    // =========================================================================

    /**
     * Lấy danh sách toàn bộ chiến dịch kèm danh sách các creative và chỉ số hiển thị.
     * Tối ưu gom query, loại bỏ hoàn toàn hiện tượng N+1 query.
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

        List<Map<String, Object>> campaignRows = jdbc.queryForList(sql);
        if (campaignRows.isEmpty()) {
            return Collections.emptyList();
        }

        // Tối ưu N+1: Query toàn bộ creatives một lần duy nhất
        String creativesSql =
                "SELECT cr.creative_id, cr.campaign_id, cr.version_number, cr.title, cr.media_url, " +
                "       cr.target_url, cr.width, cr.height, cr.file_size_bytes, cr.review_status, " +
                "       cr.rejection_reason, cr.uploaded_at, cr.approved_at, u.full_name AS reviewer_name " +
                "FROM ad_creatives cr " +
                "LEFT JOIN users u ON u.user_id = cr.reviewed_by " +
                "ORDER BY cr.campaign_id, cr.version_number DESC";

        Map<Long, List<EditorialCreativeDto>> creativesByCampaign = new HashMap<>();
        jdbc.query(creativesSql, (rs) -> {
            long cId = rs.getLong("campaign_id");
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

            EditorialCreativeDto dto = EditorialCreativeDto.builder()
                    .id(String.valueOf(rs.getLong("creative_id")))
                    .campaignId(String.valueOf(cId))
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

            creativesByCampaign.computeIfAbsent(cId, k -> new ArrayList<>()).add(dto);
        });

        // Tối ưu N+1: Query toàn bộ stats một lần duy nhất
        Map<Long, long[]> statsByCampaign = new HashMap<>();
        jdbc.query("SELECT campaign_id, COALESCE(SUM(impressions), 0), COALESCE(SUM(clicks), 0) FROM ad_stats GROUP BY campaign_id", (rs) -> {
            statsByCampaign.put(rs.getLong("campaign_id"), new long[]{rs.getLong(2), rs.getLong(3)});
        });

        List<EditorialCampaignDto> result = new ArrayList<>();
        for (Map<String, Object> row : campaignRows) {
            long campaignId = ((Number) row.get("campaign_id")).longValue();
            List<EditorialCreativeDto> creatives = creativesByCampaign.getOrDefault(campaignId, new ArrayList<>());

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

            long[] stats = statsByCampaign.getOrDefault(campaignId, new long[]{0, 0});
            long impressions = stats[0];
            long clicks = stats[1];
            BigDecimal ctr = impressions > 0
                    ? BigDecimal.valueOf(clicks * 100.0).divide(BigDecimal.valueOf(impressions), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            BigDecimal budget = (BigDecimal) row.get("accepted_amount");
            if (budget == null) {
                budget = (BigDecimal) row.get("quoted_amount");
            }

            LocalDate startDate = ((java.sql.Date) row.get("start_date")).toLocalDate();
            LocalDate endDate = ((java.sql.Date) row.get("end_date")).toLocalDate();

            result.add(EditorialCampaignDto.builder()
                    .id(String.valueOf(campaignId))
                    .bookingId(String.valueOf(campaignId))
                    .advertiserId(String.valueOf(row.get("advertiser_id")))
                    .companyName((String) row.get("company_name"))
                    .slotId(String.valueOf(row.get("slot_id")))
                    .slotName((String) row.get("slot_name"))
                    .name((String) row.get("campaign_name"))
                    .startDate(startDate)
                    .endDate(endDate)
                    .totalBudget(budget != null ? budget : BigDecimal.ZERO)
                    .status((String) row.get("status"))
                    .activeCreativeVersion(activeVersion)
                    .creatives(creatives)
                    .impressions(impressions)
                    .clicks(clicks)
                    .ctr(ctr)
                    .dailyStats(new ArrayList<>())
                    .createdAt(toLocalDateTime((Timestamp) row.get("created_at")))
                    .updatedAt(toLocalDateTime((Timestamp) row.get("updated_at")))
                    .build());
        }
        return result;
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
     * Dùng SELECT ... FOR UPDATE khóa dòng banner.
     * Chặn duyệt nếu campaign cha đã REJECTED hoặc COMPLETED.
     * Bắt buộc có lý do (notes) khi từ chối.
     */
    @Transactional
    public EditorialCreativeDto reviewCreative(Long creativeId, ReviewCreativeRequest request, String editorEmail) {
        if (!request.isApproved() && (request.getNotes() == null || request.getNotes().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập lý do từ chối banner");
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT cr.creative_id, cr.campaign_id, cr.version_number, cr.title, cr.media_url, " +
                "       cr.target_url, cr.width, cr.height, cr.file_size_bytes, c.status AS campaign_status " +
                "FROM ad_creatives cr " +
                "JOIN ad_campaigns c ON c.campaign_id = cr.campaign_id " +
                "WHERE cr.creative_id = ? FOR UPDATE",
                creativeId
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy banner creative #" + creativeId);
        }

        Map<String, Object> cr = rows.get(0);
        long campaignId = ((Number) cr.get("campaign_id")).longValue();
        int versionNumber = ((Number) cr.get("version_number")).intValue();
        String campaignStatus = (String) cr.get("campaign_status");

        if ("REJECTED".equalsIgnoreCase(campaignStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chiến dịch đã bị từ chối, không thể duyệt banner");
        }
        if ("COMPLETED".equalsIgnoreCase(campaignStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chiến dịch đã kết thúc, không thể duyệt banner");
        }

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
                    request.getNotes().trim(),
                    editorId,
                    creativeId
            );

            logAudit(editorId, "REJECT_CREATIVE", "AD_CREATIVE", creativeId, Map.of(
                    "campaignId", campaignId,
                    "versionNumber", versionNumber,
                    "notes", request.getNotes().trim()
            ));

            log.info("Editor {} rejected creative #{} (version {}) for campaign #{}: notes={}",
                    editorId, creativeId, versionNumber, campaignId, request.getNotes().trim());
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
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa xác thực danh tính biên tập viên");
        }
        List<Long> ids = jdbc.query(
                "SELECT user_id FROM users WHERE email = ? AND status = 'ACTIVE'",
                (rs, r) -> rs.getLong(1),
                email
        );
        if (ids.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản không tồn tại hoặc không có quyền truy cập");
        }
        return ids.get(0);
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
