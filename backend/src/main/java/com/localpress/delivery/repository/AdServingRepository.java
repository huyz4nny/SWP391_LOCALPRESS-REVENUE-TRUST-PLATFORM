package com.localpress.delivery.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class AdServingRepository {
    private final JdbcTemplate jdbc;
    public record Slot(String id,String code,String name,String dimensions,int capacity) {}
    public record Creative(long campaignId,long creativeId,String title,String imageUrl,String targetUrl,String companyName) {}
    public List<Slot> slots() {
        return jdbc.query("SELECT slot_id,slot_code,name,dimensions,capacity FROM ad_slots ORDER BY slot_id",
                (rs,row)->new Slot(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getInt(5)));
    }
    public List<Creative> eligible(String code,LocalDate today) {
        return jdbc.query("""
                SELECT c.campaign_id,v.creative_id,c.campaign_name,v.media_url,v.target_url,a.company_name
                FROM ad_slots s JOIN ad_campaigns c ON c.slot_id=s.slot_id
                JOIN advertisers a ON a.advertiser_id=c.advertiser_id JOIN ad_creatives v ON v.campaign_id=c.campaign_id
                WHERE s.slot_code=? AND s.status='ACTIVE' AND c.status IN ('APPROVED','ACTIVE')
                  AND c.start_date<=? AND c.end_date>=? AND c.payment_status='PAID' AND c.quotation_status='ACCEPTED'
                  AND c.contract_reference IS NOT NULL AND TRIM(c.contract_reference)<>''
                  AND v.review_status='APPROVED' AND (v.scan_status IS NULL OR v.scan_status='SAFE')
                  AND NOT EXISTS(SELECT 1 FROM ad_creatives n WHERE n.campaign_id=c.campaign_id
                      AND n.review_status='APPROVED' AND n.version_number>v.version_number)
                ORDER BY c.campaign_id
                """,(rs,row)->new Creative(rs.getLong(1),rs.getLong(2),rs.getString(3),rs.getString(4),rs.getString(5),rs.getString(6)),code,today,today);
    }
    public boolean adFree(String email,LocalDate today) {
        if(email==null) return false;
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM subscriptions s JOIN subscription_plans p ON p.plan_id=s.plan_id
                JOIN users u ON u.user_id=s.user_id WHERE u.email=? AND u.status='ACTIVE'
                AND (u.locked_until IS NULL OR u.locked_until<=CURRENT_TIMESTAMP)
                AND s.status='ACTIVE' AND s.start_date<=? AND s.end_date>=?
                AND p.has_ad_free=TRUE AND p.access_scope='ALL')
                """,Boolean.class,email,today,today));
    }
    public void impression(Creative c,LocalDate day) {
        jdbc.update("""
                INSERT INTO ad_stats(campaign_id,creative_id,stat_date,impressions,clicks,ctr) VALUES (?,?,?,1,0,0)
                ON DUPLICATE KEY UPDATE ctr=ROUND(clicks*100.0/(impressions+1),4),impressions=impressions+1
                """,c.campaignId(),c.creativeId(),day);
    }
    public void click(Creative c,LocalDate day) {
        jdbc.update("UPDATE ad_stats SET ctr=ROUND((clicks+1)*100.0/impressions,4),clicks=clicks+1 "
                + "WHERE campaign_id=? AND creative_id=? AND stat_date=? AND clicks<impressions",c.campaignId(),c.creativeId(),day);
    }
    public long[] todayStats(String slotId,LocalDate day) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(s.impressions),0),COALESCE(SUM(s.clicks),0) FROM ad_stats s "
                + "JOIN ad_campaigns c ON c.campaign_id=s.campaign_id WHERE c.slot_id=? AND s.stat_date=?",
                (rs,row)->new long[]{rs.getLong(1),rs.getLong(2)},slotId,day);
    }
}
