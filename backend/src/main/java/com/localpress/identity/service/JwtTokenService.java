package com.localpress.identity.service;

import com.localpress.identity.dto.LoginResponse;
import com.localpress.identity.entity.User;
import io.jsonwebtoken.JwtBuilder;
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

    public long lifetimeMillis() {
        return expirationMs;
    }

    public LoginResponse issue(User user) {
        return issue(user, null, null);
    }

    /** sessionId được ghi vào claim sid. Filter dùng claim này để kiểm phiên thiết bị. */
    public LoginResponse issue(User user, String sessionId, Instant expiresAt) {
        Instant now = Instant.now();
        Instant exp = expiresAt == null ? now.plusMillis(expirationMs) : expiresAt;
        JwtBuilder builder = Jwts.builder()
                .issuer("localpress").audience().add("localpress-api").and()
                .subject(user.getId().toString())
                .claim("ver", user.getAuthVersion() == null ? 0L : user.getAuthVersion())
                .issuedAt(Date.from(now)).expiration(Date.from(exp));
        if (sessionId != null && !sessionId.isBlank()) {
            builder.claim("sid", sessionId.trim());
        }
        String token = builder.signWith(key, Jwts.SIG.HS256).compact();
        long seconds = Math.max(1, java.time.Duration.between(now, exp).getSeconds());
        return new LoginResponse(token, "Bearer", seconds);
    }

    public VerifiedToken verify(String token) {
        var claims = Jwts.parser().verifyWith(key)
                .requireIssuer("localpress").requireAudience("localpress-api")
                .build().parseSignedClaims(token).getPayload();
        if (claims.getExpiration() == null || claims.getIssuedAt() == null) {
            throw new IllegalArgumentException("Missing token timestamps");
        }
        long id = Long.parseLong(claims.getSubject());
        if (id <= 0) throw new IllegalArgumentException("Invalid subject");
        String sid = claims.get("sid", String.class);
        if (sid != null && sid.isBlank()) sid = null;
        Number version = claims.get("ver", Number.class);
        if (version != null && version.longValue() < 0) throw new IllegalArgumentException("Invalid token version");
        return new VerifiedToken(id, sid, version == null ? 0L : version.longValue());
    }

    public long verifyAndGetUserId(String token) {
        return verify(token).userId();
    }

    public record VerifiedToken(Long userId, String sessionId, Long version) {}
}
