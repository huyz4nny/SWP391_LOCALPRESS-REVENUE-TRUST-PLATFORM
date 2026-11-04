package com.localpress.administration.service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
@Service
@RequiredArgsConstructor
public class AdminAccountService {
    private final AdminAccess access;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public record Result(long userId,String status,int revokedDevices) {}
    @Transactional
    public Result change(Authentication auth,long userId,String action,String reason,String ip) {
        if(action==null||!Set.of("LOCK","UNLOCK","REVOKE").contains(action)||reason==null||reason.isBlank()||reason.length()>500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Chọn thao tác và nhập lý do tối đa 500 ký tự.");
        var actor=access.lockAdminMutation(auth);
        if(actor.getId()==userId) throw new ResponseStatusException(HttpStatus.CONFLICT,"Không được thao tác với chính tài khoản quản trị đang dùng.");
        String old=jdbc.query("SELECT status FROM users WHERE user_id=? FOR UPDATE",(r,n)->r.getString(1),userId).stream().findFirst()
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản."));
        String status=action.equals("LOCK")?"LOCKED":action.equals("UNLOCK")?"ACTIVE":old;
        // Invalidate JWTs even on unlock so an old session cannot revive after an account lock.
        jdbc.update("UPDATE users SET status=?,auth_version=auth_version+1,failed_attempts=CASE WHEN ?='UNLOCK' THEN 0 ELSE failed_attempts END,locked_until=CASE WHEN ?='UNLOCK' THEN NULL ELSE locked_until END WHERE user_id=?",status,action,action,userId);
        int revoked=jdbc.update("UPDATE user_devices SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL",userId);
        try { jdbc.update("INSERT INTO audit_logs(user_id,action,target_type,target_id,old_value,new_value,ip_address,result) VALUES (?,?,'USER_ACCOUNT',?,?,?,?,'SUCCESS')",actor.getId(),"ADMIN_"+action,userId,
                json.writeValueAsString(Map.of("status",old)),json.writeValueAsString(Map.of("status",status,"reason",reason.strip(),"revokedDevices",revoked)),ip); }
        catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException(e);}
        return new Result(userId,status,revoked);
    }
}
