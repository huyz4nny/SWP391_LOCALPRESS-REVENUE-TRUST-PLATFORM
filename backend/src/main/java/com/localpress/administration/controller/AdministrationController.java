package com.localpress.administration.controller;

import com.localpress.administration.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
@RequiredArgsConstructor
public class AdministrationController {
    private final AdministrationService service;
    public record RoleInput(@NotBlank String role) {}
    @GetMapping("/users") public ResponseEntity<List<AdministrationService.UserView>> users(Authentication auth) {return noCache(service.users(auth));}
    @PutMapping("/users/{userId:\\d+}/update-role")
    public AdministrationService.UserView role(Authentication auth,@PathVariable Long userId,@Valid @RequestBody RoleInput input,HttpServletRequest request) {
        return service.updateRole(auth,userId,input.role(),request.getRemoteAddr());
    }
    @GetMapping("/audit-logs") public ResponseEntity<List<AdministrationService.AuditView>> logs(Authentication auth) {return noCache(service.logs(auth));}
    @GetMapping("/ad-delivery-status") public ResponseEntity<List<AdministrationService.DeliveryView>> delivery(Authentication auth) {return noCache(service.delivery(auth));}
    @GetMapping("/paywall-settings") public ResponseEntity<PaywallPolicyService.Settings> settings(Authentication auth) {return noCache(service.settings(auth));}
    @PutMapping("/paywall-settings") public PaywallPolicyService.Settings settings(Authentication auth,@Valid @RequestBody PaywallPolicyService.Settings input,HttpServletRequest request) {
        return service.saveSettings(auth,input,request.getRemoteAddr());
    }
    private <T> ResponseEntity<T> noCache(T value) {return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
}
