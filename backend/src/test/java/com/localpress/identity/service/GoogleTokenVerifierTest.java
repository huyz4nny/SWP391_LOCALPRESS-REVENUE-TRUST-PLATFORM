package com.localpress.identity.service;

import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.web.server.ResponseStatusException;
import java.security.KeyPair;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import static org.junit.jupiter.api.Assertions.*;

class GoogleTokenVerifierTest {
    KeyPair googleKey;
    GoogleTokenVerifier verifier;

    @BeforeEach void setup() {
        googleKey = Jwts.SIG.RS256.keyPair().build();
        verifier = new GoogleTokenVerifier("test-client", NimbusJwtDecoder.withPublicKey(
                (RSAPublicKey) googleKey.getPublic()).build());
    }

    String token(String issuer, String audience, boolean verified, long expiresIn, KeyPair signer) {
        return Jwts.builder().issuer(issuer).audience().add(audience).and().subject("google-sub")
                .issuedAt(Date.from(Instant.now().minusSeconds(600)))
                .expiration(Date.from(Instant.now().plusSeconds(expiresIn)))
                .claim("email", "Reader@Gmail.com").claim("email_verified", verified)
                .claim("name", "Reader Name").claim("nonce", "test-nonce")
                .signWith(signer.getPrivate(), Jwts.SIG.RS256).compact();
    }

    void unauthorized(String token) {
        var exception = assertThrows(ResponseStatusException.class, () -> verifier.verify(token));
        assertEquals(401, exception.getStatusCode().value());
    }

    @Test void validatesRealRsaSignatureAndClaims() {
        var identity = verifier.verify(token("https://accounts.google.com", "test-client", true, 300, googleKey));
        assertEquals("google-sub", identity.subject());
        assertEquals("reader@gmail.com", identity.email());
        assertEquals("test-nonce", identity.nonce());
    }
    @Test void acceptsGoogleIssuerWithoutScheme() {
        assertNotNull(verifier.verify(token("accounts.google.com", "test-client", true, 300, googleKey)));
    }
    @Test void rejectsWrongAudience() { unauthorized(token("https://accounts.google.com", "other-client", true, 300, googleKey)); }
    @Test void rejectsWrongIssuer() { unauthorized(token("https://attacker.test", "test-client", true, 300, googleKey)); }
    @Test void rejectsExpiredToken() { unauthorized(token("https://accounts.google.com", "test-client", true, -120, googleKey)); }
    @Test void rejectsUnverifiedEmail() { unauthorized(token("https://accounts.google.com", "test-client", false, 300, googleKey)); }
    @Test void rejectsWrongSignature() {
        unauthorized(token("https://accounts.google.com", "test-client", true, 300, Jwts.SIG.RS256.keyPair().build()));
    }
    @Test void missingConfigurationIsUnavailable() {
        var unconfigured = new GoogleTokenVerifier("", NimbusJwtDecoder.withPublicKey((RSAPublicKey) googleKey.getPublic()).build());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> unconfigured.verify("anything")).getStatusCode().value());
    }
}
