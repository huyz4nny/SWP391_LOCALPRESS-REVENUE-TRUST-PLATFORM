package com.localpress.administration.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdUrlMonitorService {
    private final AdminAccess access;
    private final JdbcTemplate jdbc;
    private final AdUrlProbe probe;
    private final TransactionTemplate tx;
    private final ObjectMapper json;
    private final AdUrlScanLease lease;
    private final AdUrlScheduleSettings settings;
    public record View(long id,String campaign,String slot,String targetUrl,String baselineUrl,String scanStatus,
                       String reviewStatus,String lastScannedAt,Long checkId,String outcome,String resolvedUrl,String detail,String source) {}
    private static final String SELECT="""
        SELECT v.creative_id,c.campaign_name,s.name,v.target_url,v.resolved_url,v.scan_status,v.review_status,
        v.last_scanned_at,q.check_id,q.outcome,q.resolved_url,q.detail,q.source
        FROM ad_creatives v JOIN ad_campaigns c ON c.campaign_id=v.campaign_id
        JOIN ad_slots s ON s.slot_id=c.slot_id
        LEFT JOIN ad_url_checks q ON q.check_id=(SELECT MAX(x.check_id) FROM ad_url_checks x WHERE x.creative_id=v.creative_id)
        """;
    public List<View> list(Authentication auth) { access.requireAdmin(auth); return rows("ORDER BY v.creative_id DESC LIMIT 200"); }
    private List<View> rows(String suffix,Object... args) { return jdbc.query(SELECT+suffix,(r,n)->new View(r.getLong(1),r.getString(2),r.getString(3),r.getString(4),r.getString(5),r.getString(6),r.getString(7),r.getString(8),r.getObject(9)==null?null:r.getLong(9),r.getString(10),r.getString(11),r.getString(12),r.getString(13)),args); }
    private View read(long id) { return rows("WHERE v.creative_id=?",id).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)); }
    private void lock(long id) {
        if(jdbc.query("SELECT creative_id FROM ad_creatives WHERE creative_id=? FOR UPDATE",(r,n)->r.getLong(1),id).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy banner.");
    }
    public List<Map<String,Object>> history(Authentication auth,long id) {
        access.requireAdmin(auth); read(id);
        return jdbc.queryForList("SELECT check_id AS id,outcome,detail,resolved_url AS resolvedUrl,checked_at AS checkedAt,source FROM ad_url_checks WHERE creative_id=? ORDER BY check_id DESC LIMIT 20",id);
    }
    public View scan(Authentication auth,long id,String ip) {
        var actor=access.requireAdmin(auth);
        return lease.run("creative:"+id,()->scanInternal(id,actor.getId(),ip,"MANUAL",null))
            .orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"Banner đang được kiểm tra. Vui lòng thử lại sau."));
    }
    private View scanInternal(long id,Long actor,String ip,String source,Integer minAgeHours) {
        if(minAgeHours!=null && !isDue(id,minAgeHours)) return null;
        View before=read(id);
        var result=probe.check(before.targetUrl(),before.baselineUrl());
        return tx.execute(status->{
            lock(id);
            if(minAgeHours!=null && !isDue(id,minAgeHours)) return null;
            View current=read(id);
            if(!current.equals(before)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Dữ liệu đã đổi. Hãy tải lại trước khi kiểm tra.");
            jdbc.update("INSERT INTO ad_url_checks(creative_id,target_url,resolved_url,outcome,detail,source) VALUES (?,?,?,?,?,?)",id,before.targetUrl(),result.resolvedUrl(),result.outcome(),result.detail(),source);
            String scan=result.outcome().equals("OK")
                ? (Set.of("CHANGED","SUSPICIOUS").contains(Objects.toString(before.scanStatus(),""))?before.scanStatus():"SAFE")
                :result.outcome().equals("CHANGED")?"CHANGED":"SUSPICIOUS";
            jdbc.update("UPDATE ad_creatives SET scan_status=?,last_scanned_at=NOW() WHERE creative_id=?",scan,id);
            audit(actor,id,source.equals("AUTO")?"AD_URL_AUTO_SCAN":"AD_URL_SCAN",before,read(id),ip,"");
            return read(id);
        });
    }
    public AdUrlScheduleSettings schedule(Authentication auth) { access.requireAdmin(auth);return settings; }
    private static final String DUE="""
        FROM ad_creatives v JOIN ad_campaigns c ON c.campaign_id=v.campaign_id
        JOIN ad_slots s ON s.slot_id=c.slot_id
        WHERE s.status='ACTIVE' AND c.status IN ('ACTIVE','APPROVED')
          AND c.start_date<=? AND c.end_date>=? AND c.payment_status='PAID'
          AND c.quotation_status='ACCEPTED' AND c.contract_reference IS NOT NULL AND TRIM(c.contract_reference)<>''
          AND v.review_status='APPROVED'
          AND NOT EXISTS(SELECT 1 FROM ad_creatives n WHERE n.campaign_id=v.campaign_id
              AND n.review_status='APPROVED' AND n.version_number>v.version_number)
          AND (v.last_scanned_at IS NULL OR v.last_scanned_at<=DATE_SUB(NOW(),INTERVAL ? HOUR))
        """;
    private java.time.LocalDate today() { return java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")); }
    List<Long> due(int minAgeHours,int limit) {
        return jdbc.query("SELECT v.creative_id "+DUE+"ORDER BY v.last_scanned_at ASC,v.creative_id ASC LIMIT ?",(r,n)->r.getLong(1),today(),today(),minAgeHours,limit);
    }
    private boolean isDue(long id,int minAgeHours) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 "+DUE+"AND v.creative_id=?)",Boolean.class,today(),today(),minAgeHours,id));
    }
    void scanScheduled(long id,int minAgeHours) {
        lease.run("creative:"+id,()->scanInternal(id,null,null,"AUTO",minAgeHours));
    }
    public View resolve(Authentication auth,long id,long checkId,String action,String note,String ip) {
        var actor=access.requireAdmin(auth);
        if(action==null||!Set.of("ACCEPT","BLOCK").contains(action)||note==null||note.isBlank()||note.length()>500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Cần chọn hành động và nhập lý do (tối đa 500 ký tự).");
        return tx.execute(status->{
            lock(id);
            View before=read(id);
            if(!Objects.equals(before.checkId(),checkId)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Kết quả kiểm tra đã thay đổi.");
            if(action.equals("ACCEPT")) {
                Integer fresh=jdbc.queryForObject("SELECT COUNT(*) FROM ad_url_checks WHERE check_id=? AND target_url=? AND checked_at>=DATE_SUB(NOW(),INTERVAL 10 MINUTE)",Integer.class,checkId,before.targetUrl());
                if(fresh==null||fresh!=1||!Set.of("OK","CHANGED").contains(Objects.toString(before.outcome(),""))||!"APPROVED".equals(before.reviewStatus()))
                    throw new ResponseStatusException(HttpStatus.CONFLICT,"Cần kiểm tra lại thành công; banner phải đang được duyệt.");
                jdbc.update("UPDATE ad_creatives SET resolved_url=?,scan_status='SAFE' WHERE creative_id=?",before.resolvedUrl(),id);
            } else jdbc.update("UPDATE ad_creatives SET review_status='BLOCKED',scan_status='SUSPICIOUS' WHERE creative_id=?",id);
            audit(actor.getId(),id,"AD_URL_"+action,before,read(id),ip,note.strip());
            return read(id);
        });
    }
    // A detected redirect is a completed check; ERROR/BLOCKED means the URL could not be checked.
    static String auditResult(String action,String outcome) {
        return (action.equals("AD_URL_SCAN") || action.equals("AD_URL_AUTO_SCAN"))
            && ("ERROR".equals(outcome) || "BLOCKED".equals(outcome)) ? "FAILURE" : "SUCCESS";
    }
    private void audit(Long user,long id,String action,View before,View after,String ip,String note) {
        try { jdbc.update("INSERT INTO audit_logs(user_id,action,target_type,target_id,old_value,new_value,ip_address,result) VALUES (?,?,'AD_CREATIVE',?,?,?,?,?)",user,action,id,json.writeValueAsString(before),json.writeValueAsString(Map.of("result",after,"note",note)),ip,auditResult(action,after.outcome())); }
        catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException(e);}
    }
}
