package com.localpress.administration.controller;
import com.localpress.administration.service.AuditSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/audit-logs/search")
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
public class AuditSearchController {
    private final AuditSearchService service;
    @GetMapping
    public ResponseEntity<AuditSearchService.Page> search(Authentication auth,
        @RequestParam(defaultValue="") String actor,@RequestParam(defaultValue="") String action,@RequestParam(defaultValue="") String target,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,@RequestParam(required=false) Long before, @RequestParam(defaultValue="") String result) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.search(auth,actor,action,target,from,to,before,result));
    }
}
