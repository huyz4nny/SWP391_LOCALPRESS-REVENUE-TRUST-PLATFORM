package com.localpress.identity.controller;

import com.localpress.identity.dto.GoogleLoginRequest;
import com.localpress.identity.dto.LoginResponse;
import com.localpress.identity.service.GoogleLoginNonceService;
import com.localpress.identity.service.GoogleLoginService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth/google")
@RequiredArgsConstructor
public class GoogleLoginController {
    private final GoogleLoginService login;
    private final GoogleLoginNonceService nonces;
    @Value("${localpress.google.client-id:}")
    private String clientId;

    @GetMapping("/nonce")
    public ResponseEntity<NonceResponse> nonce(HttpServletRequest request) {
        if (clientId.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Đăng nhập Google chưa được cấu hình");
        String nonce = nonces.issue();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, cookie(nonce, request.isSecure(), 300).toString())
                .body(new NonceResponse(nonce));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody GoogleLoginRequest body,
            @CookieValue(name = GoogleLoginNonceService.COOKIE, required = false) String nonce,
            HttpServletRequest request) {
        LoginResponse response = login.login(body.idToken(), nonce);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, cookie("", request.isSecure(), 0).toString()).body(response);
    }

    private ResponseCookie cookie(String value, boolean secure, int seconds) {
        return ResponseCookie.from(GoogleLoginNonceService.COOKIE, value).httpOnly(true)
                .secure(secure).sameSite("Lax").path("/api/v1/auth/google")
                .maxAge(Duration.ofSeconds(seconds)).build();
    }

    public record NonceResponse(String nonce) {}
}
