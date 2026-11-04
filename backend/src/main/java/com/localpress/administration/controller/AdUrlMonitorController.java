package com.localpress.administration.controller;
import com.localpress.administration.service.AdUrlMonitorService;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController
@RequestMapping("/api/v1/admin/ad-url-monitor")
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
@RequiredArgsConstructor
public class AdUrlMonitorController {
    private final AdUrlMonitorService service;
    public record Resolution(long checkId,String action,String note) {}
    @GetMapping public ResponseEntity<List<AdUrlMonitorService.View>> list(Authentication auth) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(auth));
    }
    @GetMapping("/schedule") public ResponseEntity<com.localpress.administration.service.AdUrlScheduleSettings> schedule(Authentication auth) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.schedule(auth)); }
    @GetMapping("/{id}/history") public ResponseEntity<List<Map<String,Object>>> history(Authentication auth,@PathVariable long id) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.history(auth,id)); }
    @PostMapping("/{id}/scan") public AdUrlMonitorService.View scan(Authentication auth,@PathVariable long id,HttpServletRequest req) { return service.scan(auth,id,req.getRemoteAddr()); }
    @PostMapping("/{id}/resolve") public AdUrlMonitorService.View resolve(Authentication auth,@PathVariable long id,@RequestBody Resolution input,HttpServletRequest req) {
        return service.resolve(auth,id,input.checkId(),input.action(),input.note(),req.getRemoteAddr());
    }
    @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<Map<String,Object>> error(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("status",e.getStatusCode().value(),"message",e.getReason()==null?"Không thể xử lý yêu cầu.":e.getReason()));
    }
}
