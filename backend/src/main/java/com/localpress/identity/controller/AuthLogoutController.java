package com.localpress.identity.controller;

import com.localpress.shared.device.DeviceSessionContext;
import com.localpress.shared.device.DeviceSessionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthLogoutController {

    private final DeviceSessionService devices;

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        Object sessionId = request.getAttribute(DeviceSessionContext.SESSION_ID);
        if (sessionId instanceof String sid && !sid.isBlank()) {
            devices.revoke(sid);
        }
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
