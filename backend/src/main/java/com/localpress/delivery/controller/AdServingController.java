package com.localpress.delivery.controller;

import com.localpress.delivery.service.AdServingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/delivery")
@RequiredArgsConstructor
public class AdServingController {
    private final AdServingService service;
    public record Tracking(@NotBlank @Size(max=64) String token) {}
    @GetMapping("/ad-slots/{slotCode}/serve")
    public ResponseEntity<AdServingService.Offer> serve(@PathVariable String slotCode,Authentication auth,HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).varyBy("Authorization")
                .body(service.serve(slotCode,auth==null?null:auth.getName(),request.getRemoteAddr()));
    }
    @PostMapping("/impressions") public Map<String,Boolean> impression(@Valid @RequestBody Tracking input) {
        return Map.of("recorded",service.track(input.token(),false));
    }
    @PostMapping("/clicks") public Map<String,Boolean> click(@Valid @RequestBody Tracking input) {
        return Map.of("recorded",service.track(input.token(),true));
    }
}
