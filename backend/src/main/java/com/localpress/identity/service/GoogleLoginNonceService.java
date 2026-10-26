package com.localpress.identity.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/** Short-lived, one-use challenges; restart invalidates pending Google logins. */
@Service
public class GoogleLoginNonceService {
    public static final String COOKIE = "localpress_google_nonce";
    private final Map<String, Instant> nonces = new HashMap<>();
    private final SecureRandom random = new SecureRandom();

    public synchronized String issue() {
        Instant now = Instant.now();
        nonces.values().removeIf(expiry -> !expiry.isAfter(now));
        if (nonces.size() >= 10000) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Vui lòng thử đăng nhập lại sau");
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String nonce = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        nonces.put(nonce, now.plusSeconds(300));
        return nonce;
    }

    public synchronized void consume(String cookie, String tokenNonce) {
        if (cookie == null || tokenNonce == null || !MessageDigest.isEqual(
                cookie.getBytes(StandardCharsets.UTF_8), tokenNonce.getBytes(StandardCharsets.UTF_8))) {
            throw invalidNonce();
        }
        Instant expiry = nonces.remove(cookie);
        if (expiry == null || !expiry.isAfter(Instant.now())) throw invalidNonce();
    }

    private ResponseStatusException invalidNonce() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại");
    }
}
