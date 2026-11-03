package com.localpress.administration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.delivery.repository.AdServingRepository;
import com.localpress.delivery.service.AdServingService;
import com.localpress.identity.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdministrationService {
    private final AdminAccess access;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final AdServingRepository ads;
    private final PaywallPolicyService policies;

    public record UserView(String id,String name,String email,String phone,String role,String avatarUrl,
                           String companyId,String companyName,String createdAt,boolean isActive) {}
    public record AuditView(String id,String userId,String userName,String userRole,String action,
                            String module,String description,String ipAddress,String timestamp) {}
    public record DeliveryView(String slotId,String slotName,String slotCode,int currentActiveCampaigns,int maxCapacity,
                               String status,long todayImpressions,long todayClicks,double todayCtr) {}

    public List<UserView> users(Authentication auth) {
        access.requireAdmin(auth);
        return jdbc.query("""
                SELECT u.user_id,u.full_name,u.email,u.phone,u.role,u.avatar_url,a.advertiser_id,a.company_name,u.created_at,u.status
                FROM users u LEFT JOIN advertisers a ON a.user_id=u.user_id ORDER BY u.user_id
                """,(rs,row)->new UserView(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),
                rs.getString(6),rs.getString(7),rs.getString(8),rs.getString(9),"ACTIVE".equals(rs.getString(10))));
    }

    @Transactional
    public UserView updateRole(Authentication auth,Long userId,String role,String ip) {
        User actor=access.requireAdmin(auth);
        try {User.Role.valueOf(role);} catch(Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Vai trò không được backend hỗ trợ");
        }
        if(actor.getId().equals(userId)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Không được tự thay đổi vai trò của phiên quản trị hiện tại");
        String oldRole=jdbc.query("SELECT role FROM users WHERE user_id=? FOR UPDATE",(rs,row)->rs.getString(1),userId)
                .stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản"));
        if(!oldRole.equals(role)) {
            jdbc.update("UPDATE users SET role=? WHERE user_id=?",role,userId);
            try {jdbc.update("INSERT INTO audit_logs(user_id,action,target_type,target_id,old_value,new_value,ip_address) "
                    +"VALUES (?,'UPDATE_USER_ROLE','USER_ROLE',?,?,?,?)",actor.getId(),userId,
                    json.writeValueAsString(Map.of("role",oldRole)),json.writeValueAsString(Map.of("role",role)),ip);
            } catch(com.fasterxml.jackson.core.JsonProcessingException e) {throw new IllegalStateException(e);}
        }
        return users(auth).stream().filter(u->u.id().equals(userId.toString())).findFirst().orElseThrow();
    }

    public List<AuditView> logs(Authentication auth) {
        access.requireAdmin(auth);
        return jdbc.query("""
                SELECT l.audit_id,l.user_id,COALESCE(u.full_name,'Hệ thống'),COALESCE(u.role,'SYSTEM_ADMIN'),
                l.action,l.target_type,l.new_value,l.ip_address,l.created_at FROM audit_logs l
                LEFT JOIN users u ON u.user_id=l.user_id ORDER BY l.audit_id DESC LIMIT 200
                """,(rs,row)->new AuditView(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),
                module(rs.getString(6)),Objects.toString(rs.getString(7),rs.getString(6)),rs.getString(8),rs.getString(9)));
    }

    private String module(String target) {
        if(target==null) return "SECURITY";
        if(target.contains("PAYWALL")) return "PAYWALL";
        if(target.contains("ARTICLE")||target.contains("COMMENT")) return "EDITORIAL";
        if(target.contains("AD")||target.contains("CAMPAIGN")) return "ADVERTISING";
        if(target.contains("ORDER")||target.contains("TRANSACTION")||target.contains("REFUND")||target.contains("WALLET")) return "FINANCE";
        return "SECURITY";
    }

    public List<DeliveryView> delivery(Authentication auth) {
        access.requireAdmin(auth);
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        return ads.slots().stream().map(slot->{
            int count=(int)ads.eligible(slot.code(),today).stream().filter(AdServingService::validCreative).count();
            long[] stats=ads.todayStats(slot.id(),today);
            return new DeliveryView(slot.id(),slot.name(),slot.code(),count,slot.capacity(),
                    count>slot.capacity()?"OVER_CAPACITY":count>0?"SERVING":"IDLE",stats[0],stats[1],
                    stats[0]==0?0:stats[1]*100.0/stats[0]);
        }).toList();
    }

    public PaywallPolicyService.Settings settings(Authentication auth) {access.requireAdmin(auth);return policies.read();}
    public PaywallPolicyService.Settings saveSettings(Authentication auth,PaywallPolicyService.Settings input,String ip) {
        User actor=access.requireAdmin(auth);
        return policies.save(input,actor.getId(),actor.getFullName(),ip);
    }
}
