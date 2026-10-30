package com.localpress.advertising;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.finance.dto.request.CreateOrderRequest;
import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.dto.response.OrderStatusResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.finance.service.PaymentProcessingService;
import com.localpress.shared.event.PaymentSuccessEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * UC004-UC007 của SV1: gửi booking, xác nhận báo giá, tạo đơn thanh toán và nhận kết quả thanh toán.
 * Một booking chính là một dòng ad_campaigns (SDS ADV-2). Thứ tự khóa luôn là ad_slots rồi ad_campaigns.
 */
@Service
public class AdBookingService {
    private static final Logger log = LoggerFactory.getLogger(AdBookingService.class);
    static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Campaign đang chiếm lịch: chưa bị từ chối/kết thúc, không vướng xung đột tiền về muộn, đã trả tiền hoặc còn hạn giữ chỗ. */
    static final String OCCUPYING = "status IN ('PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED') AND payment_issue IS NULL " +
            "AND (payment_status = 'PAID' OR hold_expires_at IS NULL OR hold_expires_at > NOW())";

    private static final String BOOKING_SELECT = "SELECT c.*, s.slot_code, s.name AS slot_name, s.base_price, " +
            "s.pricing_type, a.company_name FROM ad_campaigns c JOIN ad_slots s ON s.slot_id = c.slot_id " +
            "JOIN advertisers a ON a.advertiser_id = c.advertiser_id ";

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final PaymentProcessingService payments;
    private final FinanceCurrentUser financeUser;
    private final TransactionTemplate newTransaction;
    private final int paymentHoldMinutes;

    public AdBookingService(JdbcTemplate jdbc, ObjectMapper json, PaymentProcessingService payments,
                            FinanceCurrentUser financeUser, PlatformTransactionManager txManager,
                            @Value("${localpress.advertising.payment-hold-minutes:30}") int paymentHoldMinutes) {
        this.jdbc = jdbc;
        this.json = json;
        this.payments = payments;
        this.financeUser = financeUser;
        this.newTransaction = new TransactionTemplate(txManager);
        this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.paymentHoldMinutes = paymentHoldMinutes;
    }

    public record Advertiser(long userId, Long advertiserId, String companyName, String verificationStatus) {}

    public record BookingInput(String requestKey, String campaignName, long slotId, LocalDate startDate,
                               LocalDate endDate, String contactPerson, String contactPhone, String contactEmail) {}

    public record Availability(boolean available, int capacity, String inventoryMode, List<LocalDate> fullDates) {}

    public record Booking(String id, String advertiserId, String companyName, String campaignName,
                          String contactPerson, String contactPhone, String contactEmail,
                          String slotId, String slotName, String slotCode, LocalDate startDate, LocalDate endDate,
                          long daysCount, BigDecimal standardPrice, BigDecimal discountPercent, BigDecimal finalPrice,
                          String quotationNotes, int quoteVersion, String bookingStatus, String paymentStatus,
                          String deliveryStatus, String campaignId, boolean termsAccepted, LocalDateTime acceptedAt,
                          LocalDateTime holdExpiresAt, String paymentOrderCode, String paymentIssue,
                          String rejectionReason, LocalDateTime createdAt, LocalDateTime updatedAt) {}

    private record Slot(long id, int capacity, String inventoryMode) {}

    private record CampaignRow(long id, long advertiserId, long slotId, long ownerUserId, LocalDate startDate,
                               LocalDate endDate, String status, String quotationStatus, int quoteVersion,
                               Integer acceptedQuoteVersion, BigDecimal quotedAmount, BigDecimal acceptedAmount,
                               String paymentStatus, String paymentOrderCode, LocalDateTime holdExpiresAt,
                               String campaignName) {}

    public Advertiser advertiser(String email) {
        return jdbc.query("SELECT u.user_id, a.advertiser_id, a.company_name, a.verification_status FROM users u " +
                                "LEFT JOIN advertisers a ON a.user_id = u.user_id " +
                                "WHERE u.email = ? AND u.role = 'ADVERTISER' AND u.status = 'ACTIVE'",
                        (rs, row) -> new Advertiser(rs.getLong("user_id"), nullableLong(rs, "advertiser_id"),
                                rs.getString("company_name"), rs.getString("verification_status")), email)
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ tài khoản doanh nghiệp được thao tác"));
    }

    private Advertiser advertiserWithProfile(String email) {
        Advertiser me = advertiser(email);
        if (me.advertiserId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vui lòng tạo hồ sơ doanh nghiệp trước khi đặt quảng cáo");
        }
        return me;
    }

    // ------------------------------------------------------------------ UC004: lịch trống

    public Availability availability(long slotId, LocalDate start, LocalDate end) {
        validateSchedule(start, end);
        Slot slot = slot(slotId, false);
        List<LocalDate> full = fullDates(slot, start, end, 0);
        return new Availability(full.isEmpty(), slot.capacity(), slot.inventoryMode(), full);
    }

    /**
     * Ngày đã đủ sức chứa trong khoảng [start, end]. Điều kiện giao nhau theo Rule 7:
     * start_date <= newEnd AND end_date >= newStart; sức chứa tính theo từng ngày cho slot xoay vòng.
     */
    private List<LocalDate> fullDates(Slot slot, LocalDate start, LocalDate end, long excludeCampaignId) {
        // FOR SHARE = locking read: đọc bản commit mới nhất, không dùng snapshot REPEATABLE READ lấy trước lúc chờ khóa slot.
        List<LocalDate[]> ranges = jdbc.query("SELECT start_date, end_date FROM ad_campaigns WHERE slot_id = ? " +
                        "AND campaign_id <> ? AND start_date <= ? AND end_date >= ? AND " + OCCUPYING + " FOR SHARE",
                (rs, row) -> new LocalDate[]{rs.getDate("start_date").toLocalDate(), rs.getDate("end_date").toLocalDate()},
                slot.id(), excludeCampaignId, end, start);
        List<LocalDate> full = new ArrayList<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            LocalDate d = day;
            long used = ranges.stream().filter(r -> !d.isBefore(r[0]) && !d.isAfter(r[1])).count();
            if (used >= slot.capacity()) full.add(day);
        }
        return full;
    }

    private Slot slot(long slotId, boolean lock) {
        return jdbc.query("SELECT slot_id, capacity, inventory_mode FROM ad_slots WHERE slot_id = ? AND status = 'ACTIVE'" +
                                (lock ? " FOR UPDATE" : ""),
                        (rs, row) -> new Slot(rs.getLong("slot_id"), rs.getInt("capacity"), rs.getString("inventory_mode")),
                        slotId).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vị trí quảng cáo không tồn tại hoặc đã ngừng bán"));
    }

    private static void validateSchedule(LocalDate start, LocalDate end) {
        if (start == null || end == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn ngày bắt đầu và kết thúc");
        }
        if (start.isBefore(LocalDate.now(VIETNAM))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu không được ở quá khứ (giờ Việt Nam)");
        }
        if (end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày kết thúc không được trước ngày bắt đầu");
        }
    }

    // ------------------------------------------------------------------ UC005: gửi booking

    @Transactional
    public Booking createBooking(String email, BookingInput input) {
        Advertiser me = advertiserWithProfile(email);
        if (!"VERIFIED".equals(me.verificationStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Hồ sơ doanh nghiệp chưa được xác minh nên chưa gửi được booking");
        }
        validateSchedule(input.startDate(), input.endDate());
        Booking replay = byRequestKey(me.advertiserId(), input.requestKey());
        if (replay != null) return replay;

        // Khóa slot đến khi commit: hai doanh nghiệp gửi cùng lúc sẽ xếp hàng ở đây (Rule 7).
        Slot slot = slot(input.slotId(), true);
        replay = byRequestKey(me.advertiserId(), input.requestKey());
        if (replay != null) return replay;
        if (!fullDates(slot, input.startDate(), input.endDate(), 0).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Vị trí vừa được giữ chỗ trong khoảng ngày đã chọn, vui lòng chọn lịch khác");
        }
        jdbc.update("INSERT INTO ad_campaigns (advertiser_id, slot_id, request_key, campaign_name, contact_person, " +
                        "contact_phone, contact_email, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')",
                me.advertiserId(), slot.id(), input.requestKey(), input.campaignName(), input.contactPerson(),
                input.contactPhone(), input.contactEmail(), input.startDate(), input.endDate());
        Booking created = byRequestKey(me.advertiserId(), input.requestKey());
        audit(me.userId(), "AD_BOOKING_SUBMITTED", Long.parseLong(created.id()), created);
        return created;
    }

    private Booking byRequestKey(long advertiserId, String requestKey) {
        return jdbc.query(BOOKING_SELECT + "WHERE c.advertiser_id = ? AND c.request_key = ?", this::mapBooking,
                advertiserId, requestKey).stream().findFirst().orElse(null);
    }

    public List<Booking> myBookings(String email) {
        Advertiser me = advertiser(email);
        if (me.advertiserId() == null) return List.of();
        return jdbc.query(BOOKING_SELECT + "WHERE c.advertiser_id = ? ORDER BY c.campaign_id DESC", this::mapBooking,
                me.advertiserId());
    }

    /** Đọc chi tiết; nếu đơn đã có mã thanh toán mà chưa ghi nhận PAID thì hỏi lại finance (tự phục hồi khi lỡ event). */
    public Booking booking(String email, long id) {
        Advertiser me = advertiserWithProfile(email);
        CampaignRow row = owned(me, id, false);
        if (row.paymentOrderCode() != null && !"PAID".equals(row.paymentStatus())) {
            syncPayment(row);
        }
        return bookingDto(id);
    }

    Booking bookingDto(long id) {
        return jdbc.query(BOOKING_SELECT + "WHERE c.campaign_id = ?", this::mapBooking, id).get(0);
    }

    private void syncPayment(CampaignRow row) {
        try {
            OrderStatusResponse order = payments.getOrderStatusByCode(financeUser.require(), row.paymentOrderCode());
            if (order.isPaid()) {
                newTransaction.executeWithoutResult(status -> confirmPayment(row.id(), row.ownerUserId(),
                        order.getAmount(), order.getPaidAt(), order.getTransactionId()));
            }
        } catch (RuntimeException e) {
            log.warn("Không đối chiếu được đơn {} của campaign #{}: {}", row.paymentOrderCode(), row.id(), e.getMessage());
        }
    }

    /** 404 khi không tồn tại, 403 khi thuộc doanh nghiệp khác (Rule 14 - chống IDOR). */
    CampaignRow owned(Advertiser me, long id, boolean lock) {
        CampaignRow row = jdbc.query("SELECT c.*, a.user_id AS owner_user_id FROM ad_campaigns c " +
                        "JOIN advertisers a ON a.advertiser_id = c.advertiser_id WHERE c.campaign_id = ?" +
                        (lock ? " FOR UPDATE" : ""), this::mapRow, id).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy booking"));
        if (me.advertiserId() == null || row.advertiserId() != me.advertiserId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập booking này");
        }
        return row;
    }

    // ------------------------------------------------------------------ UC006: xác nhận báo giá

    @Transactional
    public Booking acceptQuotation(String email, long id, int quoteVersion, boolean termsAccepted) {
        Advertiser me = advertiserWithProfile(email);
        CampaignRow row = owned(me, id, true);
        if ("ACCEPTED".equals(row.quotationStatus())) {
            if (row.acceptedQuoteVersion() != null && row.acceptedQuoteVersion() == quoteVersion) return bookingDto(id);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking đã xác nhận một phiên bản báo giá khác");
        }
        if ("REJECTED".equals(row.status()) || "REJECTED".equals(row.quotationStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking đã bị từ chối, không thể xác nhận báo giá");
        }
        if (row.quoteVersion() == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tòa soạn chưa gửi báo giá cho booking này");
        }
        if (row.quotedAmount() == null || row.quotedAmount().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Báo giá chưa có số tiền hợp lệ, vui lòng liên hệ tòa soạn");
        }
        if (row.quoteVersion() != quoteVersion) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Báo giá vừa được tòa soạn cập nhật, vui lòng tải lại và xem bản mới");
        }
        if (!termsAccepted) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng đồng ý điều khoản báo giá trước khi xác nhận");
        }
        jdbc.update("UPDATE ad_campaigns SET quotation_status = 'ACCEPTED', accepted_quote_version = ?, " +
                        "accepted_amount = quoted_amount, accepted_by = ?, accepted_at = NOW(), " +
                        "hold_expires_at = NOW() + INTERVAL ? MINUTE WHERE campaign_id = ?",
                quoteVersion, me.userId(), paymentHoldMinutes, id);
        Booking accepted = bookingDto(id);
        audit(me.userId(), "AD_QUOTATION_ACCEPTED", id, accepted);
        return accepted;
    }

    // ------------------------------------------------------------------ UC007: thanh toán

    /**
     * Tạo (hoặc dùng lại) đơn thanh toán AD qua bộ xử lý dùng chung của SV4.
     * Số tiền lấy từ snapshot báo giá đã chốt ở server, không tin số tiền do trình duyệt gửi.
     */
    @Transactional
    public OrderCreateResponse createPayment(String email, long id) {
        Advertiser me = advertiserWithProfile(email);
        CampaignRow peek = owned(me, id, false);
        Slot slot = slot(peek.slotId(), true);
        CampaignRow row = owned(me, id, true);
        if (!"ACCEPTED".equals(row.quotationStatus()) || row.acceptedAmount() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vui lòng xác nhận báo giá trước khi thanh toán");
        }
        if ("REJECTED".equals(row.status()) || "COMPLETED".equals(row.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking không còn ở trạng thái thanh toán được");
        }
        if ("PAID".equals(row.paymentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking đã được thanh toán");
        }
        FinanceCurrentUser.Principal principal = financeUser.require();
        if (row.paymentOrderCode() != null) {
            OrderCreateResponse current = payments.getPaymentView(principal, row.paymentOrderCode());
            if (current.isPaid()) {
                confirmPayment(id, row.ownerUserId(), current.getAmount(), current.getPaidAt(), current.getTransactionId());
                return current;
            }
            if ("PENDING".equals(current.getStatus()) && !current.isExpired()
                    && current.getAmount().compareTo(row.acceptedAmount()) == 0) {
                return current;
            }
        }
        boolean holdExpired = row.holdExpiresAt() != null && !row.holdExpiresAt().isAfter(now());
        if (holdExpired && !fullDates(slot, row.startDate(), row.endDate(), id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Hết hạn giữ chỗ và vị trí đã có doanh nghiệp khác đặt, vui lòng gửi booking với lịch mới");
        }
        OrderCreateResponse order = payments.createOrder(me.userId(), CreateOrderRequest.builder()
                .orderType("AD")
                .targetId(id)
                .amount(row.acceptedAmount())
                .description("Quang cao " + row.campaignName())
                .targetTitle(row.campaignName())
                .build());
        jdbc.update("UPDATE ad_campaigns SET payment_order_code = ?, payment_status = 'PENDING', " +
                        "hold_expires_at = GREATEST(COALESCE(hold_expires_at, NOW()), NOW() + INTERVAL ? MINUTE) WHERE campaign_id = ?",
                order.getOrderCode(), paymentHoldMinutes, id);
        audit(me.userId(), "AD_PAYMENT_ORDER_CREATED", id, Map.of("orderCode", order.getOrderCode(),
                "amount", order.getAmount()));
        return order;
    }

    /**
     * Nhận PaymentSuccessEvent sau khi giao dịch finance đã commit, xử lý trong transaction riêng.
     * Lỗi ở đây không làm mất tiền đã ghi nhận: campaign giữ payment_order_code và được đối chiếu lại khi đọc booking.
     */
    @TransactionalEventListener(fallbackExecution = true)
    public void onPaymentSuccess(PaymentSuccessEvent event) {
        if (!"AD".equals(event.getTransactionType()) || event.getTargetId() == null) return;
        try {
            newTransaction.executeWithoutResult(status -> confirmPayment(event.getTargetId(), event.getUserId(),
                    event.getAmount(), event.getPaidAt(), event.getTransactionId()));
        } catch (RuntimeException e) {
            log.error("Chưa ghi nhận được thanh toán cho campaign #{} (giao dịch #{}), sẽ đối chiếu lại khi đọc booking",
                    event.getTargetId(), event.getTransactionId(), e);
        }
    }

    /** Ghi nhận PAID đúng một lần. Gọi trong transaction đang mở; khóa slot rồi campaign. */
    void confirmPayment(long campaignId, Long payerUserId, BigDecimal amount, LocalDateTime paidAt, Long transactionId) {
        Long slotId = jdbc.query("SELECT slot_id FROM ad_campaigns WHERE campaign_id = ?",
                (rs, r) -> rs.getLong(1), campaignId).stream().findFirst().orElse(null);
        if (slotId == null) return;
        Slot slot = jdbc.query("SELECT slot_id, capacity, inventory_mode FROM ad_slots WHERE slot_id = ? FOR UPDATE",
                (rs, r) -> new Slot(rs.getLong(1), rs.getInt(2), rs.getString(3)), slotId).get(0);
        CampaignRow row = jdbc.query("SELECT c.*, a.user_id AS owner_user_id FROM ad_campaigns c " +
                "JOIN advertisers a ON a.advertiser_id = c.advertiser_id WHERE c.campaign_id = ? FOR UPDATE",
                this::mapRow, campaignId).get(0);
        if ("PAID".equals(row.paymentStatus())) return;

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("transactionId", transactionId);
        detail.put("amount", amount);
        if (payerUserId == null || payerUserId != row.ownerUserId()) {
            audit(payerUserId, "AD_PAYMENT_OWNER_MISMATCH", campaignId, detail);
            return;
        }
        if (row.acceptedAmount() == null || amount == null || amount.compareTo(row.acceptedAmount()) < 0) {
            detail.put("expected", row.acceptedAmount());
            audit(payerUserId, "AD_PAYMENT_AMOUNT_MISMATCH", campaignId, detail);
            return;
        }
        LocalDateTime paid = paidAt != null ? paidAt : now();
        boolean late = row.holdExpiresAt() != null && paid.isAfter(row.holdExpiresAt());
        // Rule 6: tiền về sau hạn giữ chỗ -> kiểm tra lại lịch; hết chỗ thì chờ hoàn tiền/chọn lịch mới, không phát quảng cáo.
        String issue = late && !fullDates(slot, row.startDate(), row.endDate(), campaignId).isEmpty()
                ? "LATE_PAYMENT_CONFLICT" : null;
        jdbc.update("UPDATE ad_campaigns SET payment_status = 'PAID', payment_issue = ? WHERE campaign_id = ?",
                issue, campaignId);
        audit(payerUserId, issue == null ? "AD_PAYMENT_CONFIRMED" : "AD_PAYMENT_LATE_CONFLICT", campaignId, detail);
    }

    private LocalDateTime now() {
        return jdbc.queryForObject("SELECT NOW()", LocalDateTime.class);
    }

    // ------------------------------------------------------------------ mapping

    void audit(Long userId, String action, long campaignId, Object value) {
        jdbc.update("INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value) VALUES (?, ?, 'AD_CAMPAIGN', ?, ?)",
                userId, action, campaignId, json.valueToTree(value).toString());
    }

    private CampaignRow mapRow(ResultSet rs, int row) throws SQLException {
        return new CampaignRow(rs.getLong("campaign_id"), rs.getLong("advertiser_id"), rs.getLong("slot_id"),
                rs.getLong("owner_user_id"), rs.getDate("start_date").toLocalDate(), rs.getDate("end_date").toLocalDate(),
                rs.getString("status"), rs.getString("quotation_status"), rs.getInt("quote_version"),
                nullableInt(rs, "accepted_quote_version"), rs.getBigDecimal("quoted_amount"),
                rs.getBigDecimal("accepted_amount"), rs.getString("payment_status"), rs.getString("payment_order_code"),
                time(rs, "hold_expires_at"), rs.getString("campaign_name"));
    }

    private Booking mapBooking(ResultSet rs, int row) throws SQLException {
        LocalDate start = rs.getDate("start_date").toLocalDate();
        LocalDate end = rs.getDate("end_date").toLocalDate();
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        BigDecimal base = rs.getBigDecimal("base_price");
        BigDecimal standard = switch (rs.getString("pricing_type")) {
            case "CPD" -> base.multiply(BigDecimal.valueOf(days));
            case "FLAT_FEE" -> base;
            default -> null; // CPM/CPC: giá theo báo giá của tòa soạn
        };
        int quoteVersion = rs.getInt("quote_version");
        String status = rs.getString("status");
        String quotation = rs.getString("quotation_status");
        BigDecimal accepted = rs.getBigDecimal("accepted_amount");
        BigDecimal finalPrice = accepted != null ? accepted : quoteVersion > 0 ? rs.getBigDecimal("quoted_amount") : standard;
        String bookingStatus = "REJECTED".equals(status) || "REJECTED".equals(quotation) ? "REJECTED"
                : "ACCEPTED".equals(quotation) ? "CONFIRMED" : quoteVersion > 0 ? "QUOTED" : "SUBMITTED";
        String delivery = switch (status) {
            case "ACTIVE" -> "LIVE";
            case "SUSPENDED" -> "PAUSED";
            case "COMPLETED" -> "COMPLETED";
            default -> "NOT_STARTED";
        };
        String id = String.valueOf(rs.getLong("campaign_id"));
        return new Booking(id, String.valueOf(rs.getLong("advertiser_id")), rs.getString("company_name"),
                rs.getString("campaign_name"), rs.getString("contact_person"), rs.getString("contact_phone"),
                rs.getString("contact_email"), String.valueOf(rs.getLong("slot_id")), rs.getString("slot_name"),
                rs.getString("slot_code"), start, end, days, standard, rs.getBigDecimal("quote_discount_percent"),
                finalPrice, rs.getString("quote_notes"), quoteVersion, bookingStatus, rs.getString("payment_status"),
                delivery, id, "ACCEPTED".equals(quotation), time(rs, "accepted_at"), time(rs, "hold_expires_at"),
                rs.getString("payment_order_code"), rs.getString("payment_issue"), rs.getString("rejection_reason"),
                time(rs, "created_at"), time(rs, "updated_at"));
    }

    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static Integer nullableInt(ResultSet rs, String column) throws SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    static LocalDateTime time(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toLocalDateTime();
    }
}
