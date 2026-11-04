package com.localpress.administration.service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.LocalDate;
import java.util.*;
@Service
@RequiredArgsConstructor
public class AuditSearchService {
    private final AdminAccess access;
    private final JdbcTemplate jdbc;
    public record Entry(String id,String userName,String action,String targetType,String targetId,String description,String ipAddress,String timestamp,String result) {}
    public record Page(List<Entry> items,String nextCursor) {}
    public record Query(String sql,List<Object> args) {}
    public static Query query(String actor,String action,String target,LocalDate from,LocalDate to,Long before) {
        return query(actor,action,target,from,to,before,"");
    }
    public static Query query(String actor,String action,String target,LocalDate from,LocalDate to,Long before,String result) {
        if(from!=null && to!=null && from.isAfter(to)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        if(before!=null && before<=0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mốc trang không hợp lệ");
        StringBuilder sql=new StringBuilder(" FROM audit_logs l LEFT JOIN users u ON u.user_id=l.user_id WHERE 1=1");
        List<Object> args=new ArrayList<>();
        if(result!=null && !result.isBlank()) {
            if(!Set.of("SUCCESS","FAILURE","UNKNOWN").contains(result)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Kết quả không hợp lệ");
            sql.append(" AND l.result=?"); args.add(result);
        }
        String[] values={actor,action,target};
        String[] columns={"CONCAT(COALESCE(u.full_name,'Hệ thống'),' ',COALESCE(u.email,''),' ',COALESCE(CAST(l.user_id AS CHAR),''))","l.action","CONCAT(l.target_type,' ',COALESCE(CAST(l.target_id AS CHAR),''))"};
        for(int i=0;i<values.length;i++) if(values[i]!=null && !values[i].isBlank()) {
            String value=values[i].trim();
            if(value.length()>120) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Bộ lọc tối đa 120 ký tự");
            sql.append(" AND ").append(columns[i]).append(" LIKE ? ESCAPE '!'");
            args.add("%"+value.replace("!","!!").replace("%","!%").replace("_","!_")+"%");
        }
        if(from!=null) {sql.append(" AND l.created_at>=?");args.add(from.atStartOfDay());}
        if(to!=null) {sql.append(" AND l.created_at<?");args.add(to.plusDays(1).atStartOfDay());}
        if(before!=null) {sql.append(" AND l.audit_id<?");args.add(before);}
        sql.append(" ORDER BY l.audit_id DESC LIMIT 51");
        return new Query(sql.toString(),args);
    }
    public Page search(Authentication auth,String actor,String action,String target,LocalDate from,LocalDate to,Long before) {
        return search(auth,actor,action,target,from,to,before,"");
    }
    public Page search(Authentication auth,String actor,String action,String target,LocalDate from,LocalDate to,Long before,String result) {
        access.requireAdmin(auth);
        Query q=query(actor,action,target,from,to,before,result);
        var rows=jdbc.query("SELECT l.audit_id,COALESCE(u.full_name,'Hệ thống'),l.action,l.target_type,l.target_id,l.new_value,l.ip_address,l.created_at,l.result"+q.sql(),
            (rs,n)->new Entry(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),rs.getString(6),rs.getString(7),rs.getString(8),rs.getString(9)),q.args().toArray());
        return new Page(rows.stream().limit(50).toList(),rows.size()>50?rows.get(49).id():null);
    }
}
