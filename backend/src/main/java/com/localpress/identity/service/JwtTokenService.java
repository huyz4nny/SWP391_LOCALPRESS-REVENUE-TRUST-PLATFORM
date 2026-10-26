package com.localpress.identity.service;

import com.localpress.identity.dto.LoginResponse;
import com.localpress.identity.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/** LocalPress tokens are distinct from Google credentials and accepted only by our API. */
public class JwtTokenService {
    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenService(String secret, long expirationMs) {
        if (expirationMs < 1000 || expirationMs > 86400000) {
            throw new IllegalArgumentException("JWT lifetime must be between 1 second and 24 hours");
        }
        this.expirationMs = expirationMs;
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException(
                    "LOCALPRESS_JWT_SECRET is required outside dev; use at least 32 UTF-8 bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public LoginResponse issue(User user) {
        Instant now = Instant.now();
        String token = Jwts.builder()
                .issuer("localpress").audience().add("localpress-api").and()
                .subject(user.getId().toString())
                .issuedAt(Date.from(now)).expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(key, Jwts.SIG.HS256).compact();
        return new LoginResponse(token, "Bearer", expirationMs / 1000);
    }

    public long verifyAndGetUserId(String token) {
        var claims = Jwts.parser().verifyWith(key)
                .requireIssuer("localpress").requireAudience("localpress-api")
                .build().parseSignedClaims(token).getPayload();
        if (claims.getExpiration() == null || claims.getIssuedAt() == null) {
            throw new IllegalArgumentException("Missing token timestamps");
        }
        long id = Long.parseLong(claims.getSubject());
        if (id <= 0) throw new IllegalArgumentException("Invalid subject");
        return id;
    }
}
