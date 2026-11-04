package com.localpress.administration.controller;

import com.localpress.administration.service.AdSlotConfigService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/ad-slots")
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
@RequiredArgsConstructor
public class AdSlotConfigController {
    private final AdSlotConfigService service;
    @GetMapping
    public ResponseEntity<List<AdSlotConfigService.View>> list(Authentication auth) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(auth));
    }
    @PutMapping("/{id:\\d+}")
    public AdSlotConfigService.View update(Authentication auth, @PathVariable long id,
            @Valid @RequestBody AdSlotConfigService.Input input, HttpServletRequest request) {
        return service.update(auth, id, input, request.getRemoteAddr());
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> failure(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("status", error.getStatusCode().value(),
                "message", error.getReason() == null ? "Không thể cập nhật vị trí quảng cáo." : error.getReason()));
    }
}
