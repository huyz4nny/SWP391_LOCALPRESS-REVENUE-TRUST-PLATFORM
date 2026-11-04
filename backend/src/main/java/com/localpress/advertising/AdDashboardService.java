package com.localpress.advertising;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.localpress.advertising.CampaignStage.date;
import static com.localpress.advertising.CampaignStage.derive;
import static com.localpress.advertising.CampaignStage.money;
import static com.localpress.advertising.CampaignStage.number;
import static com.localpress.advertising.CampaignStage.text;

/**
 * UC001, UC010, UC011: dashboard, hiệu suất theo ngày; UC012: biên bản nghiệm thu.
 * Số liệu đọc từ ad_stats do SV5 ghi. CTR tính lại từ tổng (Rule 16), không cộng dồn cột ctr.
 */
@Service
public class AdDashboardService {
    private static final long MAX_RANGE_DAYS = 366;

    private final JdbcTemplate jdbc;
    private final AdBookingService bookings;
    private final CampaignStage stages;

    public AdDashboardService(JdbcTemplate jdbc, AdBookingService bookings, CampaignStage stages) {
        this.jdbc = jdbc;
        this.bookings = bookings;
        this.stages = stages;
    }

    public record CampaignSummary(String campaignId, String campaignName, String slotName, LocalDate startDate,
                                  LocalDate endDate, String stage, String stageReason, String paymentStatus,
                                  long impressions, long clicks, BigDecimal ctr, BigDecimal paidAmount,
                                  String contractNumber, String contractFileUrl, boolean acceptanceAvailable,
                                  String acceptanceReason) {}

    /** excludedEventsAvailable luôn false: SV5 chưa lưu số sự kiện bị loại (UC011). */
    public record Dashboard(List<CampaignSummary> campaigns, Map<String, Long> stageCounts, long impressions,
                            long clicks, BigDecimal ctr, BigDecimal totalPaid, LocalDateTime generatedAt,
                            boolean excludedEventsAvailable) {}

    public record DailyPerformance(String campaignId, String campaignName, LocalDate date, long impressions,
                                   long clicks, BigDecimal ctr) {}

    public record AcceptanceReport(String campaignId, String campaignName, String companyName, String taxCode,
                                   String address, String contractNumber, String slotName, LocalDate startDate,
                                   LocalDate endDate, long impressions, long clicks, BigDecimal ctr,
                                   long servedDays, List<LocalDateTime> pauses, LocalDateTime generatedAt) {}

    public Dashboard dashboard(String email, LocalDate from, LocalDate to, Long campaignId) {
        return dashboard(email, from, to, campaignId, false);
    }

    /** Màn chứng từ cần mọi chiến dịch, không lọc theo kỳ. */
    public List<CampaignSummary> documents(String email) {
        return dashboard(email, null, null, null, true).campaigns();
    }

    private Dashboard dashboard(String email, LocalDate from, LocalDate to, Long campaignId, boolean allSchedules) {
        LocalDate[] range = range(from, to);
        var me = bookings.advertiser(email);
        if (campaignId != null) bookings.owned(me, campaignId, false);
        var rows = me.advertiserId() == null
                ? List.<Map<String, Object>>of()
                : stages.rows(me.advertiserId(), campaignId);

        Map<Long, long[]> inRange = new HashMap<>();
        jdbc.query("SELECT t.campaign_id, SUM(t.impressions), SUM(t.clicks) FROM ad_stats t "
                        + "JOIN ad_campaigns c ON c.campaign_id = t.campaign_id "
                        + "WHERE c.advertiser_id = ? AND t.stat_date BETWEEN ? AND ? GROUP BY t.campaign_id",
                rs -> {
                    inRange.put(rs.getLong(1), new long[]{rs.getLong(2), rs.getLong(3)});
                },
                me.advertiserId(), range[0], range[1]);
        // Nghiệm thu xét lượt hiển thị cả đời chiến dịch, không theo kỳ đang lọc.
        Map<Long, Long> lifetime = new HashMap<>();
        jdbc.query("SELECT t.campaign_id, SUM(t.impressions) FROM ad_stats t "
                        + "JOIN ad_campaigns c ON c.campaign_id = t.campaign_id "
                        + "WHERE c.advertiser_id = ? GROUP BY t.campaign_id",
                rs -> {
                    lifetime.put(rs.getLong(1), rs.getLong(2));
                },
                me.advertiserId());

        List<CampaignSummary> campaigns = new ArrayList<>();
        Map<String, Long> counts = new LinkedHashMap<>();
        long impressions = 0;
        long clicks = 0;
        BigDecimal paid = BigDecimal.ZERO;
        LocalDate today = stages.today();
        for (var c : rows) {
            long id = number(c, "campaign_id");
            // Kỳ lọc chọn các chiến dịch có lịch giao với kỳ; tổng tiền là tiền thu của các chiến dịch đó.
            boolean outside = date(c, "start_date").isAfter(range[1]) || date(c, "end_date").isBefore(range[0]);
            if (!allSchedules && outside) continue;

            var state = derive(c, today);
            long[] stat = inRange.getOrDefault(id, new long[2]);
            String acceptance = acceptanceReason(c, today, lifetime.getOrDefault(id, 0L));
            BigDecimal amount = text(c, "payment_status").equals("PAID") ? money(c, "paid_amount") : BigDecimal.ZERO;
            campaigns.add(new CampaignSummary(String.valueOf(id), text(c, "campaign_name"), text(c, "slot_name"),
                    date(c, "start_date"), date(c, "end_date"), state.stage(), state.reason(),
                    text(c, "payment_status"), stat[0], stat[1], ctr(stat[0], stat[1]), amount,
                    text(c, "contract_reference"), text(c, "contract_file_url"), acceptance.isEmpty(), acceptance));

            counts.merge(state.stage(), 1L, Long::sum);
            impressions += stat[0];
            clicks += stat[1];
            paid = paid.add(amount);
        }
        return new Dashboard(campaigns, counts, impressions, clicks, ctr(impressions, clicks), paid, bookings.now(), false);
    }

    public List<DailyPerformance> performance(String email, LocalDate from, LocalDate to, Long campaignId) {
        var me = bookings.advertiser(email);
        if (campaignId != null) bookings.owned(me, campaignId, false);
        var range = range(from, to);
        // Arrays.asList chấp nhận advertiserId null (chưa có hồ sơ) -> truy vấn trả rỗng.
        List<Object> args = new ArrayList<>(Arrays.asList(me.advertiserId(), range[0], range[1]));
        String filter = "";
        if (campaignId != null) {
            filter = " AND c.campaign_id = ?";
            args.add(campaignId);
        }
        return jdbc.query("SELECT c.campaign_id, c.campaign_name, t.stat_date, "
                        + "SUM(t.impressions) impressions, SUM(t.clicks) clicks "
                        + "FROM ad_stats t JOIN ad_campaigns c ON c.campaign_id = t.campaign_id "
                        + "WHERE c.advertiser_id = ? AND t.stat_date BETWEEN ? AND ?" + filter
                        + " GROUP BY c.campaign_id, c.campaign_name, t.stat_date ORDER BY t.stat_date, c.campaign_id",
                (rs, r) -> new DailyPerformance(rs.getString(1), rs.getString(2), rs.getDate(3).toLocalDate(),
                        rs.getLong(4), rs.getLong(5), ctr(rs.getLong(4), rs.getLong(5))),
                args.toArray());
    }

    public AcceptanceReport acceptance(String email, long id) {
        var me = bookings.advertiser(email);
        bookings.owned(me, id, false);
        var c = stages.rows(me.advertiserId(), id).get(0);
        var stat = jdbc.queryForMap("SELECT COALESCE(SUM(impressions), 0) impressions, COALESCE(SUM(clicks), 0) clicks, "
                + "COUNT(DISTINCT CASE WHEN impressions > 0 THEN stat_date END) served_days "
                + "FROM ad_stats WHERE campaign_id = ?", id);
        long impressions = number(stat, "impressions");
        long clicks = number(stat, "clicks");
        String reason = acceptanceReason(c, stages.today(), impressions);
        if (!reason.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, reason);

        var profile = jdbc.queryForMap("SELECT company_name, tax_code, address FROM advertisers WHERE advertiser_id = ?",
                me.advertiserId());
        var pauses = jdbc.query("SELECT created_at FROM audit_logs WHERE target_type = 'AD_CAMPAIGN' AND target_id = ? "
                        + "AND (action = 'AD_CAMPAIGN_SUSPENDED' "
                        + "OR JSON_UNQUOTE(JSON_EXTRACT(new_value, '$.status')) = 'SUSPENDED') ORDER BY audit_id",
                (rs, r) -> rs.getTimestamp(1).toLocalDateTime(), id);
        return new AcceptanceReport(String.valueOf(id), text(c, "campaign_name"), text(profile, "company_name"),
                text(profile, "tax_code"), text(profile, "address"), text(c, "contract_reference"),
                text(c, "slot_name"), date(c, "start_date"), date(c, "end_date"), impressions, clicks,
                ctr(impressions, clicks), number(stat, "served_days"), pauses, bookings.now());
    }

    /** Rỗng = được lập biên bản. Phải đã trả, không hủy/từ chối, hết lịch, có hợp đồng và đã thực sự được phát. */
    static String acceptanceReason(Map<String, Object> c, LocalDate today, long impressions) {
        if (Set.of("CANCELLED", "REJECTED").contains(text(c, "status"))) return "Chiến dịch đã hủy hoặc bị từ chối";
        if (!text(c, "payment_status").equals("PAID")) return "Chiến dịch chưa thanh toán hoặc đã hoàn toàn bộ";
        if (!text(c, "payment_issue").isBlank()) return "Thanh toán đang cần xử lý";
        if (!date(c, "end_date").isBefore(today)) return "Chưa kết thúc lịch quảng cáo";
        if (text(c, "contract_reference").isBlank()) return "Chưa có hợp đồng";
        if (impressions <= 0) return "Chưa ghi nhận lượt hiển thị thực tế";
        return "";
    }

    /** Mặc định 30 ngày gần nhất; from > to hoặc dài quá 366 ngày -> 400. */
    LocalDate[] range(LocalDate from, LocalDate to) {
        LocalDate today = stages.today();
        LocalDate start = from == null ? today.minusDays(29) : from;
        LocalDate end = to == null ? today : to;
        if (start.isAfter(end) || ChronoUnit.DAYS.between(start, end) >= MAX_RANGE_DAYS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng ngày phải đúng thứ tự và không quá 366 ngày");
        }
        return new LocalDate[]{start, end};
    }

    /** CTR = clicks × 100 / impressions, 2 chữ số; 0 khi chưa có lượt hiển thị. */
    static BigDecimal ctr(long impressions, long clicks) {
        if (impressions == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(clicks).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(impressions), 2, RoundingMode.HALF_UP);
    }
}
