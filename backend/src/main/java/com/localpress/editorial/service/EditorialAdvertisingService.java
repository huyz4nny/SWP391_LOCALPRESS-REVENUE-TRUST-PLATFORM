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

            BigDecimal budget = toBigDecimal(row.get("accepted_amount"));
            if (budget == null) {
                budget = toBigDecimal(row.get("quoted_amount"));
            }

            LocalDate startDate = toLocalDate(row.get("start_date"));
            LocalDate endDate = toLocalDate(row.get("end_date"));

            result.add(EditorialCampaignDto.builder()
                    .id(String.valueOf(campaignId))
                    .bookingId(String.valueOf(campaignId))
                    .advertiserId(row.get("advertiser_id") != null ? String.valueOf(row.get("advertiser_id")) : null)
                    .companyName((String) row.get("company_name"))
                    .slotId(row.get("slot_id") != null ? String.valueOf(row.get("slot_id")) : null)
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
                    .createdAt(toLocalDateTime(row.get("created_at")))
                    .updatedAt(toLocalDateTime(row.get("updated_at")))
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

    // =========================================================================
    // UC022 & UC023: CAMPAIGN ELIGIBILITY CHECK (AD SERVING GATEKEEPER - MÀN II.2.7)
    // =========================================================================

    /**
     * Lấy danh sách kiểm tra 5 điều kiện tiên quyết phát sóng (Gatekeeper Checklist).
     */
    public List<CampaignEligibilityDto> getEligibilityChecklist() {
        String sql = "SELECT c.campaign_id, c.advertiser_id, a.company_name, c.campaign_name, " +
                "s.slot_code, s.name AS slot_name, s.status AS slot_status, " +
                "c.start_date, c.end_date, COALESCE(c.accepted_amount, c.quoted_amount) AS amount, " +
                "c.payment_status, c.quotation_status, c.contract_reference, c.contract_file_url, c.status " +
                "FROM ad_campaigns c " +
                "JOIN advertisers a ON a.advertiser_id = c.advertiser_id " +
                "JOIN ad_slots s ON s.slot_id = c.slot_id " +
                "ORDER BY c.campaign_id DESC";

        return jdbc.query(sql, (rs, rowNum) -> {
            Long campaignId = rs.getLong("campaign_id");
            Long advertiserId = rs.getLong("advertiser_id");
            String companyName = rs.getString("company_name");
            String campaignName = rs.getString("campaign_name");
            String slotCode = rs.getString("slot_code");
            String slotName = rs.getString("slot_name");
            String slotStatus = rs.getString("slot_status");
            LocalDate startDate = toLocalDate(rs.getDate("start_date"));
            LocalDate endDate = toLocalDate(rs.getDate("end_date"));
            BigDecimal amount = rs.getBigDecimal("amount");
            String paymentStatus = rs.getString("payment_status");
            String quotationStatus = rs.getString("quotation_status");
            String contractReference = rs.getString("contract_reference");
            String contractFileUrl = rs.getString("contract_file_url");
            String status = rs.getString("status");

            // 1. Điều kiện thanh toán (PAID)
            boolean paymentPassed = "PAID".equalsIgnoreCase(paymentStatus);
            String paymentMessage = paymentPassed
                    ? "Đã xác nhận thanh toán đầy đủ (" + paymentStatus + ")"
                    : "Chưa thanh toán hợp lệ (Hiện tại: " + paymentStatus + ")";

            // 2. Điều kiện báo giá (ACCEPTED)
            boolean quotationPassed = "ACCEPTED".equalsIgnoreCase(quotationStatus);
            String quotationMessage = quotationPassed
                    ? "Doanh nghiệp đã chấp thuận báo giá chính thức"
                    : "Chưa hoàn tất thỏa thuận báo giá (Hiện tại: " + quotationStatus + ")";

            // 3. Điều kiện hợp đồng (contract_reference non-empty)
            boolean contractPassed = contractReference != null && !contractReference.trim().isEmpty();
            String contractMessage = contractPassed
                    ? "Hợp đồng pháp lý đã ký: " + contractReference
                    : "Thiếu số hiệu hợp đồng pháp lý quảng cáo";

            // 4. Điều kiện Creative: Bản mới nhất đã APPROVED và an toàn
            List<Map<String, Object>> creativeRows = jdbc.queryForList(
                    "SELECT version_number, review_status, scan_status, media_url, target_url " +
                    "FROM ad_creatives WHERE campaign_id = ? ORDER BY version_number DESC LIMIT 1",
                    campaignId
            );

            boolean creativePassed = false;
            Integer creativeVer = null;
            String revStatus = null;
            String scStatus = null;
            String mediaUrl = null;
            String targetUrl = null;
            String creativeMsg;

            if (creativeRows.isEmpty()) {
                creativeMsg = "Doanh nghiệp chưa tải lên bản thiết kế (creative)";
            } else {
                Map<String, Object> cr = creativeRows.get(0);
                creativeVer = ((Number) cr.get("version_number")).intValue();
                revStatus = (String) cr.get("review_status");
                scStatus = (String) cr.get("scan_status");
                mediaUrl = (String) cr.get("media_url");
                targetUrl = (String) cr.get("target_url");

                boolean isApproved = "APPROVED".equalsIgnoreCase(revStatus);
                boolean isSafe = scStatus == null || "SAFE".equalsIgnoreCase(scStatus);
                creativePassed = isApproved && isSafe;

                if (creativePassed) {
                    creativeMsg = "Banner phiên bản v" + creativeVer + " đã duyệt & an toàn";
                } else if (!isApproved) {
                    creativeMsg = "Banner v" + creativeVer + " chưa được duyệt (Trạng thái: " + revStatus + ")";
                } else {
                    creativeMsg = "Cảnh báo bảo mật banner v" + creativeVer + " (Quét URL: " + scStatus + ")";
                }
            }

            // 5. Điều kiện Vị trí hiển thị (Slot is ACTIVE)
            boolean slotPassed = "ACTIVE".equalsIgnoreCase(slotStatus);
            String slotMessage = slotPassed
                    ? "Vị trí quảng cáo [" + slotCode + "] đang mở"
                    : "Vị trí quảng cáo [" + slotCode + "] đang khóa / bảo trì (" + slotStatus + ")";

            LocalDate today = LocalDate.now();
            boolean dateValid = startDate != null && endDate != null && !today.isBefore(startDate) && !today.isAfter(endDate);
            boolean overallEligible = paymentPassed && quotationPassed && contractPassed && creativePassed && slotPassed;
            boolean canActivate = overallEligible && !"ACTIVE".equalsIgnoreCase(status);

            return CampaignEligibilityDto.builder()
                    .campaignId(campaignId)
                    .advertiserId(advertiserId)
                    .companyName(companyName)
                    .campaignName(campaignName)
                    .slotCode(slotCode)
                    .slotName(slotName)
                    .startDate(startDate)
                    .endDate(endDate)
                    .quotedAmount(amount)
                    .status(status)
                    .paymentPassed(paymentPassed)
                    .paymentStatus(paymentStatus)
                    .paymentMessage(paymentMessage)
                    .quotationPassed(quotationPassed)
                    .quotationStatus(quotationStatus)
                    .quotationMessage(quotationMessage)
                    .contractPassed(contractPassed)
                    .contractReference(contractReference)
                    .contractFileUrl(contractFileUrl)
                    .contractMessage(contractMessage)
                    .creativePassed(creativePassed)
                    .creativeVersion(creativeVer)
                    .creativeReviewStatus(revStatus)
                    .creativeScanStatus(scStatus)
                    .creativeMediaUrl(mediaUrl)
                    .creativeTargetUrl(targetUrl)
                    .creativeMessage(creativeMsg)
                    .slotPassed(slotPassed)
                    .slotStatus(slotStatus)
                    .slotMessage(slotMessage)
                    .dateRangeValid(dateValid)
                    .overallEligible(overallEligible)
                    .canActivate(canActivate)
                    .build();
        });
    }

    /**
     * Kích hoạt phát sóng chiến dịch (LIVE) khi thỏa mãn toàn bộ 5 điều kiện (Rule 9).
     */
    @Transactional
    public CampaignEligibilityDto activateCampaign(Long campaignId, String editorEmail) {
        Long userId = resolveUserId(editorEmail);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT campaign_id, status FROM ad_campaigns WHERE campaign_id = ? FOR UPDATE",
                campaignId
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId);
        }

        List<CampaignEligibilityDto> list = getEligibilityChecklist();
        CampaignEligibilityDto item = list.stream()
                .filter(e -> e.getCampaignId().equals(campaignId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId));

        if (!item.isOverallEligible()) {
            StringBuilder sb = new StringBuilder("Không đủ điều kiện kích hoạt phát sóng: ");
            if (!item.isPaymentPassed()) sb.append("[Chưa thanh toán đủ] ");
            if (!item.isQuotationPassed()) sb.append("[Chưa chốt báo giá] ");
            if (!item.isContractPassed()) sb.append("[Chưa có hợp đồng] ");
            if (!item.isCreativePassed()) sb.append("[Banner chưa duyệt/URL có rủi ro] ");
            if (!item.isSlotPassed()) sb.append("[Vị trí quảng cáo không mở] ");
            throw new ResponseStatusException(HttpStatus.CONFLICT, sb.toString().trim());
        }

        jdbc.update("UPDATE ad_campaigns SET status = 'ACTIVE' WHERE campaign_id = ?", campaignId);
        logAudit(userId, "CAMPAIGN_ACTIVATED", "AD_CAMPAIGN", campaignId, Map.of(
                "campaignId", campaignId,
                "status", "ACTIVE",
                "activatedBy", editorEmail
        ));

        item.setStatus("ACTIVE");
        item.setCanActivate(false);
        return item;
    }

    // =========================================================================
    // UC023 & UC024: CAMPAIGN CONTROL (KILL-SWITCH & MAKE-GOOD - MÀN II.2.8)
    // =========================================================================

    /**
     * Lấy danh sách điều khiển vận hành chiến dịch.
     */
    public List<CampaignControlDto> getCampaignControlList() {
        String sql = "SELECT c.campaign_id, c.advertiser_id, a.company_name, c.campaign_name, " +
                "s.slot_code, s.name AS slot_name, c.start_date, c.end_date, " +
                "COALESCE(c.accepted_amount, c.quoted_amount) AS amount, " +
                "c.status, c.rejection_reason, c.updated_at " +
                "FROM ad_campaigns c " +
                "JOIN advertisers a ON a.advertiser_id = c.advertiser_id " +
                "JOIN ad_slots s ON s.slot_id = c.slot_id " +
                "ORDER BY c.campaign_id DESC";

        LocalDate today = LocalDate.now();
        return jdbc.query(sql, (rs, rowNum) -> {
            Long campId = rs.getLong("campaign_id");
            LocalDate startDate = toLocalDate(rs.getDate("start_date"));
            LocalDate endDate = toLocalDate(rs.getDate("end_date"));
            long totalDays = (startDate != null && endDate != null && !endDate.isBefore(startDate))
                    ? ChronoUnit.DAYS.between(startDate, endDate) + 1 : 0;
            long elapsedDays = 0;
            if (startDate != null) {
                if (today.isBefore(startDate)) {
                    elapsedDays = 0;
                } else if (endDate != null && today.isAfter(endDate)) {
                    elapsedDays = totalDays;
                } else {
                    elapsedDays = ChronoUnit.DAYS.between(startDate, today) + 1;
                }
            }

            Integer makeGoodDays = 0;
            try {
                makeGoodDays = jdbc.queryForObject(
                        "SELECT COUNT(*) FROM audit_logs WHERE target_type = 'AD_CAMPAIGN' AND target_id = ? AND action = 'CAMPAIGN_MAKE_GOOD'",
                        Integer.class,
                        campId
                );
            } catch (Exception ignored) {}

            return CampaignControlDto.builder()
                    .campaignId(campId)
                    .advertiserId(rs.getLong("advertiser_id"))
                    .companyName(rs.getString("company_name"))
                    .campaignName(rs.getString("campaign_name"))
                    .slotCode(rs.getString("slot_code"))
                    .slotName(rs.getString("slot_name"))
                    .startDate(startDate)
                    .endDate(endDate)
                    .amount(rs.getBigDecimal("amount"))
                    .status(rs.getString("status"))
                    .suspensionReason(rs.getString("rejection_reason"))
                    .totalPlannedDays(totalDays)
                    .elapsedDays(elapsedDays)
                    .makeGoodDaysAdded(makeGoodDays != null ? makeGoodDays : 0)
                    .lastControlledAt(toLocalDateTime(rs.getTimestamp("updated_at")))
                    .build();
        });
    }

    /**
     * Dừng khẩn cấp chiến dịch quảng cáo (Emergency Kill-Switch - UC024).
     */
    @Transactional
    public CampaignControlDto suspendCampaign(Long campaignId, SuspendCampaignRequest request, String editorEmail) {
        Long userId = resolveUserId(editorEmail);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT campaign_id, status FROM ad_campaigns WHERE campaign_id = ? FOR UPDATE",
                campaignId
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId);
        }
        String currentStatus = (String) rows.get(0).get("status");
        if (!"ACTIVE".equalsIgnoreCase(currentStatus) && !"APPROVED".equalsIgnoreCase(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ có thể dừng khẩn cấp chiến dịch đang hoạt động (ACTIVE) hoặc đã duyệt (APPROVED)");
        }

        jdbc.update(
                "UPDATE ad_campaigns SET status = 'SUSPENDED', rejection_reason = ? WHERE campaign_id = ?",
                request.getReason(), campaignId
        );
        logAudit(userId, "CAMPAIGN_SUSPENDED", "AD_CAMPAIGN", campaignId, Map.of(
                "campaignId", campaignId,
                "oldStatus", currentStatus,
                "newStatus", "SUSPENDED",
                "reason", request.getReason(),
                "suspendedBy", editorEmail
        ));

        return getCampaignControlList().stream()
                .filter(c -> c.getCampaignId().equals(campaignId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId));
    }

    /**
     * Mở lại chiến dịch sau khi khắc phục sự cố (UC024).
     */
    @Transactional
    public CampaignControlDto resumeCampaign(Long campaignId, String editorEmail) {
        Long userId = resolveUserId(editorEmail);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT campaign_id, status FROM ad_campaigns WHERE campaign_id = ? FOR UPDATE",
                campaignId
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId);
        }
        String currentStatus = (String) rows.get(0).get("status");
        if (!"SUSPENDED".equalsIgnoreCase(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ có thể mở lại chiến dịch đang bị tạm ngưng (SUSPENDED)");
        }

        jdbc.update("UPDATE ad_campaigns SET status = 'ACTIVE' WHERE campaign_id = ?", campaignId);
        logAudit(userId, "CAMPAIGN_RESUMED", "AD_CAMPAIGN", campaignId, Map.of(
                "campaignId", campaignId,
                "oldStatus", "SUSPENDED",
                "newStatus", "ACTIVE",
                "resumedBy", editorEmail
        ));

        return getCampaignControlList().stream()
                .filter(c -> c.getCampaignId().equals(campaignId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId));
    }

    /**
     * Bù ngày phát sóng cho chiến dịch do sự cố tạm ngưng (Make-Good - UC024).
     */
    @Transactional
    public CampaignControlDto makeGoodCampaign(Long campaignId, MakeGoodRequest request, String editorEmail) {
        Long userId = resolveUserId(editorEmail);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT campaign_id, end_date FROM ad_campaigns WHERE campaign_id = ? FOR UPDATE",
                campaignId
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId);
        }
        LocalDate oldEndDate = toLocalDate(rows.get(0).get("end_date"));
        LocalDate newEndDate = oldEndDate != null ? oldEndDate.plusDays(request.getExtraDays()) : LocalDate.now().plusDays(request.getExtraDays());

        jdbc.update("UPDATE ad_campaigns SET end_date = ? WHERE campaign_id = ?", newEndDate, campaignId);
        logAudit(userId, "CAMPAIGN_MAKE_GOOD", "AD_CAMPAIGN", campaignId, Map.of(
                "campaignId", campaignId,
                "oldEndDate", oldEndDate != null ? oldEndDate.toString() : "",
                "newEndDate", newEndDate.toString(),
                "extraDays", request.getExtraDays(),
                "reason", request.getReason(),
                "compensatedBy", editorEmail
        ));

        return getCampaignControlList().stream()
                .filter(c -> c.getCampaignId().equals(campaignId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId));
    }

    // =========================================================================
    // UC019 & UC025: CONTRACT MANAGEMENT & VIP TIERING (MÀN II.2.9)
    // =========================================================================

    /**
     * Lấy danh sách hồ sơ hợp đồng quảng cáo B2B (UC019, UC025).
     * Truy vấn từ bảng ad_contracts (hoặc ad_campaigns), kết hợp quan hệ với đối tác và vị trí slot.
     */
    public List<EditorialContractDto> getContracts() {
        String sql = "SELECT c.campaign_id, c.advertiser_id, a.company_name, a.tax_code, " +
                "c.contact_person, c.contact_email, c.contact_phone, " +
                "c.campaign_name, s.slot_code, s.name AS slot_name, " +
                "ct.contract_id, ct.contract_number, ct.signing_date, ct.contract_value AS ct_val, " +
                "ct.contract_file_url AS ct_file_url, ct.status AS ct_status, " +
                "c.contract_reference, c.contract_file_url, " +
                "COALESCE(ct.contract_value, c.accepted_amount, c.quoted_amount) AS amount, " +
                "c.start_date, c.end_date, c.quotation_status, c.payment_status, c.status " +
                "FROM ad_campaigns c " +
                "JOIN advertisers a ON a.advertiser_id = c.advertiser_id " +
                "JOIN ad_slots s ON s.slot_id = c.slot_id " +
                "LEFT JOIN ad_contracts ct ON ct.campaign_id = c.campaign_id " +
                "ORDER BY c.campaign_id DESC";

        return jdbc.query(sql, (rs, rowNum) -> {
            Long campId = rs.getLong("campaign_id");
            List<ContractAddendumDto> addendums = getAddendumsForCampaign(campId);

            String contractNum = rs.getString("contract_number");
            if (contractNum == null || contractNum.isBlank()) {
                contractNum = rs.getString("contract_reference");
            }

            String fileUrl = rs.getString("ct_file_url");
            if (fileUrl == null || fileUrl.isBlank()) {
                fileUrl = rs.getString("contract_file_url");
            }

            LocalDate signDate = toLocalDate(rs.getDate("signing_date"));
            if (signDate == null) {
                signDate = toLocalDate(rs.getDate("start_date"));
            }

            Long contractId = rs.getObject("contract_id") != null ? rs.getLong("contract_id") : null;
            String contractStatus = rs.getString("ct_status");
            if (contractStatus == null || contractStatus.isBlank()) {
                contractStatus = (contractNum != null && !contractNum.isBlank()) ? "SIGNED" : "DRAFT";
            }

            return EditorialContractDto.builder()
                    .contractId(contractId)
                    .campaignId(campId)
                    .advertiserId(rs.getLong("advertiser_id"))
                    .companyName(rs.getString("company_name"))
                    .taxCode(rs.getString("tax_code"))
                    .contactPerson(rs.getString("contact_person"))
                    .contactEmail(rs.getString("contact_email"))
                    .contactPhone(rs.getString("contact_phone"))
                    .campaignName(rs.getString("campaign_name"))
                    .slotCode(rs.getString("slot_code"))
                    .slotName(rs.getString("slot_name"))
                    .contractReference(contractNum)
                    .contractNumber(contractNum)
                    .signingDate(signDate)
                    .contractFileUrl(fileUrl)
                    .contractValue(rs.getBigDecimal("amount"))
                    .startDate(toLocalDate(rs.getDate("start_date")))
                    .endDate(toLocalDate(rs.getDate("end_date")))
                    .quotationStatus(rs.getString("quotation_status"))
                    .paymentStatus(rs.getString("payment_status"))
                    .status(rs.getString("status"))
                    .contractStatus(contractStatus)
                    .addendums(addendums)
                    .build();
        });
    }

    /**
     * Tạo mới hồ sơ hợp đồng quảng cáo (UC019) với đầy đủ: số hợp đồng, ngày ký, giá trị, file đính kèm.
     */
    @Transactional
    public EditorialContractDto createContract(CreateContractRequest request, String editorEmail) {
        Long userId = resolveUserId(editorEmail);
        Long campaignId = request.getCampaignId();

        List<Map<String, Object>> campRows = jdbc.queryForList(
                "SELECT campaign_id, advertiser_id, contract_reference FROM ad_campaigns WHERE campaign_id = ? FOR UPDATE",
                campaignId
        );
        if (campRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId);
        }

        Long advertiserId = ((Number) campRows.get(0).get("advertiser_id")).longValue();

        // Kiểm tra trùng lặp số hợp đồng
        List<Long> duplicate = jdbc.query(
                "SELECT campaign_id FROM ad_campaigns WHERE contract_reference = ? AND campaign_id <> ?",
                (rs, r) -> rs.getLong(1),
                request.getContractNumber().trim(), campaignId
        );
        if (!duplicate.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã số hợp đồng [" + request.getContractNumber().trim() + "] đã tồn tại trên chiến dịch khác");
        }

        try {
            jdbc.update(
                    "INSERT INTO ad_contracts (campaign_id, advertiser_id, contract_number, signing_date, contract_value, contract_file_url, status, notes, created_by) " +
                    "VALUES (?, ?, ?, ?, ?, ?, 'SIGNED', ?, ?) " +
                    "ON DUPLICATE KEY UPDATE contract_number = VALUES(contract_number), signing_date = VALUES(signing_date), " +
                    "contract_value = VALUES(contract_value), contract_file_url = VALUES(contract_file_url), notes = VALUES(notes)",
                    campaignId, advertiserId, request.getContractNumber().trim(), request.getSigningDate(),
                    request.getContractValue(), request.getContractFileUrl(), request.getNotes(), userId
            );
        } catch (Exception e) {
            log.warn("Table ad_contracts insert fallback: {}", e.getMessage());
        }

        // Đồng bộ ngược lại ad_campaigns
        jdbc.update(
                "UPDATE ad_campaigns SET contract_reference = ?, contract_file_url = ? WHERE campaign_id = ?",
                request.getContractNumber().trim(), request.getContractFileUrl(), campaignId
        );

        logAudit(userId, "CONTRACT_CREATED", "AD_CONTRACT", campaignId, Map.of(
                "campaignId", campaignId,
                "contractNumber", request.getContractNumber().trim(),
                "signingDate", request.getSigningDate().toString(),
                "contractValue", request.getContractValue().toString(),
                "contractFileUrl", request.getContractFileUrl() != null ? request.getContractFileUrl() : "",
                "createdBy", editorEmail
        ));

        return getContracts().stream()
                .filter(c -> c.getCampaignId().equals(campaignId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR));
    }

    private List<ContractAddendumDto> getAddendumsForCampaign(Long campaignId) {
        try {
            String sql = "SELECT addendum_id, campaign_id, addendum_number, effective_date, adjustment_type, notes, created_at " +
                    "FROM ad_contract_addendums WHERE campaign_id = ? ORDER BY addendum_id ASC";
            return jdbc.query(sql, (rs, rowNum) -> ContractAddendumDto.builder()
                    .addendumId(rs.getLong("addendum_id"))
                    .campaignId(rs.getLong("campaign_id"))
                    .addendumNumber(rs.getString("addendum_number"))
                    .effectiveDate(toLocalDate(rs.getDate("effective_date")))
                    .adjustmentType(rs.getString("adjustment_type"))
                    .notes(rs.getString("notes"))
                    .createdAt(toLocalDateTime(rs.getTimestamp("created_at")))
                    .build(), campaignId);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * Cập nhật thông tin hợp đồng quảng cáo (Mã số hợp đồng, Ngày ký, Giá trị, URL file PDF).
     */
    @Transactional
    public EditorialContractDto updateContract(Long campaignId, UpdateContractRequest request, String editorEmail) {
        Long userId = resolveUserId(editorEmail);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT campaign_id, advertiser_id, contract_reference FROM ad_campaigns WHERE campaign_id = ? FOR UPDATE",
                campaignId
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId);
        }

        List<Long> duplicate = jdbc.query(
                "SELECT campaign_id FROM ad_campaigns WHERE contract_reference = ? AND campaign_id <> ?",
                (rs, r) -> rs.getLong(1),
                request.getContractReference(), campaignId
        );
        if (!duplicate.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã số hợp đồng [" + request.getContractReference() + "] đã tồn tại trên một chiến dịch khác");
        }

        Object advObj = rows.get(0).get("advertiser_id");
        Long advertiserId = advObj instanceof Number ? ((Number) advObj).longValue() : 0L;

        try {
            LocalDate signDate = request.getSigningDate() != null ? request.getSigningDate() : LocalDate.now();
            BigDecimal val = request.getContractValue() != null ? request.getContractValue() : BigDecimal.ZERO;
            jdbc.update(
                    "INSERT INTO ad_contracts (campaign_id, advertiser_id, contract_number, signing_date, contract_value, contract_file_url, status, created_by) " +
                    "VALUES (?, ?, ?, ?, ?, ?, 'SIGNED', ?) " +
                    "ON DUPLICATE KEY UPDATE contract_number = VALUES(contract_number), contract_file_url = VALUES(contract_file_url), " +
                    (request.getSigningDate() != null ? "signing_date = VALUES(signing_date), " : "") +
                    (request.getContractValue() != null ? "contract_value = VALUES(contract_value), " : "") +
                    "updated_at = NOW()",
                    campaignId, advertiserId, request.getContractReference(), signDate, val, request.getContractFileUrl(), userId
            );
        } catch (Exception e) {
            log.warn("Table ad_contracts update fallback: {}", e.getMessage());
        }

        jdbc.update(
                "UPDATE ad_campaigns SET contract_reference = ?, contract_file_url = ? WHERE campaign_id = ?",
                request.getContractReference(), request.getContractFileUrl(), campaignId
        );
        logAudit(userId, "CONTRACT_UPDATED", "AD_CAMPAIGN", campaignId, Map.of(
                "campaignId", campaignId,
                "contractReference", request.getContractReference(),
                "contractFileUrl", request.getContractFileUrl() != null ? request.getContractFileUrl() : "",
                "updatedBy", editorEmail
        ));

        return getContracts().stream()
                .filter(c -> c.getCampaignId().equals(campaignId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hợp đồng"));
    }

    /**
     * Tạo phụ lục hợp đồng quảng cáo (UC019).
     */
    @Transactional
    public EditorialContractDto createAddendum(Long campaignId, CreateContractAddendumRequest request, String editorEmail) {
        Long userId = resolveUserId(editorEmail);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT campaign_id FROM ad_campaigns WHERE campaign_id = ?",
                campaignId
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch #" + campaignId);
        }

        try {
            jdbc.update(
                    "INSERT INTO ad_contract_addendums (campaign_id, addendum_number, effective_date, adjustment_type, notes, created_by, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, NOW())",
                    campaignId, request.getAddendumNumber(), request.getEffectiveDate(), request.getAdjustmentType(), request.getNotes(), userId
            );
        } catch (Exception e) {
            log.warn("Không thể ghi ad_contract_addendums (sẽ ghi vào audit_logs): {}", e.getMessage());
        }

        logAudit(userId, "CONTRACT_ADDENDUM_CREATED", "AD_CAMPAIGN", campaignId, Map.of(
                "campaignId", campaignId,
                "addendumNumber", request.getAddendumNumber(),
                "effectiveDate", request.getEffectiveDate().toString(),
                "adjustmentType", request.getAdjustmentType(),
                "notes", request.getNotes() != null ? request.getNotes() : "",
                "createdBy", editorEmail
        ));

        return getContracts().stream()
                .filter(c -> c.getCampaignId().equals(campaignId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hợp đồng"));
    }

    /**
     * Lấy danh sách đối tác doanh nghiệp B2B và phân hạng VIP.
     */
    public List<AdvertiserVipDto> getVipAdvertisers() {
        String sql = "SELECT a.advertiser_id, a.company_name, a.tax_code, a.contact_person, a.email, a.phone, " +
                "COALESCE(a.vip_tier, 'STANDARD') AS vip_tier, " +
                "COALESCE(a.vip_discount_percent, 0.00) AS vip_discount_percent, " +
                "COALESCE(SUM(c.accepted_amount), 0) AS total_spent, " +
                "COUNT(c.campaign_id) AS campaign_count " +
                "FROM advertisers a " +
                "LEFT JOIN ad_campaigns c ON c.advertiser_id = a.advertiser_id AND c.quotation_status = 'ACCEPTED' " +
                "GROUP BY a.advertiser_id, a.company_name, a.tax_code, a.contact_person, a.email, a.phone, a.vip_tier, a.vip_discount_percent " +
                "ORDER BY total_spent DESC";
        try {
            return jdbc.query(sql, (rs, rowNum) -> AdvertiserVipDto.builder()
                    .advertiserId(rs.getLong("advertiser_id"))
                    .companyName(rs.getString("company_name"))
                    .taxCode(rs.getString("tax_code"))
                    .contactPerson(rs.getString("contact_person"))
                    .email(rs.getString("email"))
                    .phone(rs.getString("phone"))
                    .vipTier(rs.getString("vip_tier"))
                    .vipDiscountPercent(rs.getBigDecimal("vip_discount_percent"))
                    .totalSpent(rs.getBigDecimal("total_spent"))
                    .campaignCount(rs.getLong("campaign_count"))
                    .build());
        } catch (Exception e) {
            String fallbackSql = "SELECT a.advertiser_id, a.company_name, a.tax_code, a.contact_person, a.email, a.phone, " +
                    "COALESCE(SUM(c.accepted_amount), 0) AS total_spent, " +
                    "COUNT(c.campaign_id) AS campaign_count " +
                    "FROM advertisers a " +
                    "LEFT JOIN ad_campaigns c ON c.advertiser_id = a.advertiser_id AND c.quotation_status = 'ACCEPTED' " +
                    "GROUP BY a.advertiser_id, a.company_name, a.tax_code, a.contact_person, a.email, a.phone " +
                    "ORDER BY total_spent DESC";
            return jdbc.query(fallbackSql, (rs, rowNum) -> AdvertiserVipDto.builder()
                    .advertiserId(rs.getLong("advertiser_id"))
                    .companyName(rs.getString("company_name"))
                    .taxCode(rs.getString("tax_code"))
                    .contactPerson(rs.getString("contact_person"))
                    .email(rs.getString("email"))
                    .phone(rs.getString("phone"))
                    .vipTier("STANDARD")
                    .vipDiscountPercent(BigDecimal.ZERO)
                    .totalSpent(rs.getBigDecimal("total_spent"))
                    .campaignCount(rs.getLong("campaign_count"))
                    .build());
        }
    }

    /**
     * Cập nhật phân hạng VIP và mức chiết khấu cho đối tác doanh nghiệp B2B (UC019, UC025).
     *
     * QUY TẮC NGHIỆP VỤ & TÀI CHÍNH (Lưu ý quan trọng):
     * - `vip_discount_percent` lưu trên bảng `advertisers` đại diện cho mức ưu đãi theo hạng đối tác B2B (STANDARD/SILVER/GOLD/DIAMOND).
     * - Khi Tòa soạn gửi báo giá (UC018 sendQuotation), mức giá chốt `quoted_amount` (và sau này là `accepted_amount`)
     *   bắt buộc phải là GIÁ CUỐI CÙNG ĐÃ ĐƯỢC GIẢM TRỪ CHIẾT KHẤU trước khi Doanh nghiệp tạo đơn thanh toán (Payment Order).
     * - Lý do: Phía Module Finance (SV4) chỉ thu đúng số tiền ghi nhận trên đơn thanh toán; hệ thống không lưu công nợ
     *   và không hỗ trợ trừ tiền sau khi đơn hàng đã chốt thanh toán.
     */
    @Transactional
    public AdvertiserVipDto updateVipTier(Long advertiserId, UpdateVipTierRequest request, String editorEmail) {
        Long userId = resolveUserId(editorEmail);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT advertiser_id FROM advertisers WHERE advertiser_id = ?",
                advertiserId
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà quảng cáo #" + advertiserId);
        }

        try {
            jdbc.update(
                    "UPDATE advertisers SET vip_tier = ?, vip_discount_percent = ? WHERE advertiser_id = ?",
                    request.getVipTier(), request.getVipDiscountPercent(), advertiserId
            );
        } catch (Exception e) {
            log.warn("Không thể cập nhật cột vip_tier trên advertisers: {}", e.getMessage());
        }

        logAudit(userId, "ADVERTISER_VIP_UPDATED", "ADVERTISER", advertiserId, Map.of(
                "advertiserId", advertiserId,
                "vipTier", request.getVipTier(),
                "vipDiscountPercent", request.getVipDiscountPercent(),
                "notes", request.getNotes() != null ? request.getNotes() : "",
                "updatedBy", editorEmail
        ));

        return getVipAdvertisers().stream()
                .filter(a -> a.getAdvertiserId().equals(advertiserId))
                .findFirst()
                .orElse(AdvertiserVipDto.builder()
                        .advertiserId(advertiserId)
                        .vipTier(request.getVipTier())
                        .vipDiscountPercent(request.getVipDiscountPercent())
                        .build());
    }

    // =========================================================================
    // UC015 & UC028: BUSINESS OPERATIONS DASHBOARD (MÀN II.2.10)
    // =========================================================================

    /**
     * Lấy tổng quan hoạt động kinh doanh: Lấp đầy kho slot, Hàng việc khẩn tòa soạn.
     * Lưu ý Rule 17 (Module boundary):
     * Các chỉ số doanh thu (B2B thực thu, B2C gói đọc, B2C bài lẻ đã trừ hoàn tiền REFUND)
     * được ủy quyền cung cấp qua API tổng hợp từ Module Finance (SV4), không query trực tiếp bảng transactions.
     * Hệ thống đã xóa bỏ công nợ quảng cáo (b2bReceivables = 0).
     */
    public EditorialDashboardDto getDashboardOverview() {
        BigDecimal b2bTotalSigned = BigDecimal.ZERO;
        BigDecimal b2bActualPaid = BigDecimal.ZERO;
        BigDecimal b2bReceivables = BigDecimal.ZERO;
        BigDecimal b2cSubscriptions = BigDecimal.ZERO;
        BigDecimal b2cSingleArticles = BigDecimal.ZERO;
        BigDecimal totalPlatformRevenue = BigDecimal.ZERO;

        List<SlotOccupancyDto> slotOccupancies = new ArrayList<>();
        try {
            String slotSql = "SELECT slot_code, name, dimensions, capacity, base_price, pricing_type FROM ad_slots ORDER BY slot_id";
            slotOccupancies = jdbc.query(slotSql, (rs, rowNum) -> {
                String slotCode = rs.getString("slot_code");
                int capacity = rs.getInt("capacity");
                Integer activeCount = Optional.ofNullable(jdbc.queryForObject(
                        "SELECT COUNT(*) FROM ad_campaigns c JOIN ad_slots s ON s.slot_id = c.slot_id " +
                        "WHERE s.slot_code = ? AND c.status = 'ACTIVE' AND c.start_date <= CURRENT_DATE AND c.end_date >= CURRENT_DATE",
                        Integer.class, slotCode
                )).orElse(0);

                double occupancy = capacity > 0 ? Math.min(100.0, (activeCount * 100.0) / capacity) : 0.0;
                String status = occupancy >= 100.0 ? "FULL" : (occupancy >= 70.0 ? "NEAR_FULL" : "NORMAL");

                return SlotOccupancyDto.builder()
                        .slotCode(slotCode)
                        .slotName(rs.getString("name"))
                        .dimensions(rs.getString("dimensions"))
                        .capacity(capacity)
                        .basePrice(rs.getBigDecimal("base_price"))
                        .pricingType(rs.getString("pricing_type"))
                        .activeCampaignsCount(activeCount)
                        .occupancyPercentage(Math.round(occupancy * 10.0) / 10.0)
                        .status(status)
                        .build();
            });
        } catch (Exception e) {
            log.warn("Cảnh báo tính toán tỷ lệ lấp đầy: {}", e.getMessage());
        }

        long pendingArticlesCount = 0;
        long pendingBookingsCount = 0;
        long pendingCreativesCount = 0;
        long pendingCommentsCount = 0;
        List<UrgentItemDto> urgentItems = new ArrayList<>();

        try {
            pendingArticlesCount = Optional.ofNullable(jdbc.queryForObject(
                    "SELECT COUNT(*) FROM articles WHERE status = 'IN_REVIEW'", Long.class)).orElse(0L);
            pendingBookingsCount = Optional.ofNullable(jdbc.queryForObject(
                    "SELECT COUNT(*) FROM ad_campaigns WHERE quotation_status = 'PENDING'", Long.class)).orElse(0L);
            pendingCreativesCount = Optional.ofNullable(jdbc.queryForObject(
                    "SELECT COUNT(*) FROM ad_creatives WHERE review_status = 'PENDING'", Long.class)).orElse(0L);
            pendingCommentsCount = Optional.ofNullable(jdbc.queryForObject(
                    "SELECT COUNT(*) FROM comments WHERE status = 'PENDING'", Long.class)).orElse(0L);

            // 1. Bài viết chờ duyệt
            jdbc.query("SELECT a.article_id, v.title, a.created_at FROM articles a " +
                       "JOIN article_versions v ON v.article_id = a.article_id AND v.version_number = a.latest_version " +
                       "WHERE a.status = 'IN_REVIEW' ORDER BY a.article_id DESC LIMIT 3",
                    (rs, rowNum) -> {
                        urgentItems.add(UrgentItemDto.builder()
                                .id("art-" + rs.getLong("article_id"))
                                .type("ARTICLE")
                                .title("Bài viết: " + rs.getString("title"))
                                .description("Đang chờ tòa soạn thẩm định và phê duyệt xuất bản")
                                .priority("HIGH")
                                .link("/backoffice/editorial/articles")
                                .createdAt(toLocalDateTime(rs.getTimestamp("created_at")))
                                .build());
                        return null;
                    });

            // 2. Booking chờ báo giá
            jdbc.query("SELECT c.campaign_id, c.campaign_name, a.company_name, c.created_at FROM ad_campaigns c " +
                       "JOIN advertisers a ON a.advertiser_id = c.advertiser_id " +
                       "WHERE c.quotation_status = 'PENDING' ORDER BY c.campaign_id DESC LIMIT 3",
                    (rs, rowNum) -> {
                        urgentItems.add(UrgentItemDto.builder()
                                .id("bk-" + rs.getLong("campaign_id"))
                                .type("BOOKING")
                                .title("Booking: " + rs.getString("campaign_name"))
                                .description("Doanh nghiệp " + rs.getString("company_name") + " đang chờ báo giá")
                                .priority("URGENT")
                                .link("/backoffice/editorial/bookings")
                                .createdAt(toLocalDateTime(rs.getTimestamp("created_at")))
                                .build());
                        return null;
                    });

            // 3. Creative chờ duyệt
            jdbc.query("SELECT cr.creative_id, c.campaign_name, cr.uploaded_at FROM ad_creatives cr " +
                       "JOIN ad_campaigns c ON c.campaign_id = cr.campaign_id " +
                       "WHERE cr.review_status = 'PENDING' ORDER BY cr.creative_id DESC LIMIT 3",
                    (rs, rowNum) -> {
                        urgentItems.add(UrgentItemDto.builder()
                                .id("cr-" + rs.getLong("creative_id"))
                                .type("CREATIVE")
                                .title("Creative: Banner mới cho " + rs.getString("campaign_name"))
                                .description("Cần kiểm tra quy cách kích thước và quét mã độc URL")
                                .priority("HIGH")
                                .link("/backoffice/editorial/creatives")
                                .createdAt(toLocalDateTime(rs.getTimestamp("uploaded_at")))
                                .build());
                        return null;
                    });

            // 4. Bình luận chờ duyệt
            jdbc.query("SELECT comment_id, content, created_at FROM comments " +
                       "WHERE status = 'PENDING' ORDER BY comment_id DESC LIMIT 3",
                    (rs, rowNum) -> {
                        String content = rs.getString("content");
                        String shortContent = (content != null && content.length() > 50) ? content.substring(0, 50) + "..." : content;
                        urgentItems.add(UrgentItemDto.builder()
                                .id("cmt-" + rs.getLong("comment_id"))
                                .type("COMMENT")
                                .title("Bình luận: " + shortContent)
                                .description("Bình luận mới của độc giả cần kiểm duyệt quy chuẩn")
                                .priority("NORMAL")
                                .link("/backoffice/editorial/comments")
                                .createdAt(toLocalDateTime(rs.getTimestamp("created_at")))
                                .build());
                        return null;
                    });
        } catch (Exception e) {
            log.warn("Cảnh báo hàng việc khẩn: {}", e.getMessage());
        }

        return EditorialDashboardDto.builder()
                .b2bTotalSigned(b2bTotalSigned)
                .b2bActualPaid(b2bActualPaid)
                .b2bReceivables(b2bReceivables)
                .b2cSubscriptions(b2cSubscriptions)
                .b2cSingleArticles(b2cSingleArticles)
                .totalPlatformRevenue(totalPlatformRevenue)
                .slotOccupancies(slotOccupancies)
                .pendingArticlesCount(pendingArticlesCount)
                .pendingBookingsCount(pendingBookingsCount)
                .pendingCreativesCount(pendingCreativesCount)
                .pendingCommentsCount(pendingCommentsCount)
                .urgentItems(urgentItems)
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

    private static LocalDateTime toLocalDateTime(Object obj) {
        if (obj == null) return null;
        if (obj instanceof LocalDateTime ldt) return ldt;
        if (obj instanceof Timestamp ts) return ts.toLocalDateTime();
        if (obj instanceof java.util.Date d) return new Timestamp(d.getTime()).toLocalDateTime();
        return null;
    }

    private static LocalDate toLocalDate(Object obj) {
        if (obj == null) return null;
        if (obj instanceof LocalDate ld) return ld;
        if (obj instanceof java.sql.Date d) return d.toLocalDate();
        if (obj instanceof java.util.Date d) return new java.sql.Date(d.getTime()).toLocalDate();
        return null;
    }

    private static BigDecimal toBigDecimal(Object obj) {
        if (obj == null) return null;
        if (obj instanceof BigDecimal bd) return bd;
        if (obj instanceof Number num) return BigDecimal.valueOf(num.doubleValue());
        return null;
    }
}
