package com.localpress.identity.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class GoogleLoginNonceServiceTest {
    @Test void challengeIsSingleUse() {
        var service = new GoogleLoginNonceService();
        String nonce = service.issue();
        service.consume(nonce, nonce);
        assertThrows(ResponseStatusException.class, () -> service.consume(nonce, nonce));
    }
    @Test void rejectsMissingOrMismatchedCookie() {
        var service = new GoogleLoginNonceService();
        String nonce = service.issue();
        assertThrows(ResponseStatusException.class, () -> service.consume(null, nonce));
        assertThrows(ResponseStatusException.class, () -> service.consume("another-browser", nonce));
        service.consume(nonce, nonce);
    }
    @SuppressWarnings("unchecked")
    @Test void rejectsExpiredChallenge() {
        var service = new GoogleLoginNonceService();
        String nonce = service.issue();
        ((Map<String, Instant>) ReflectionTestUtils.getField(service, "nonces")).put(nonce, Instant.now().minusSeconds(1));
        assertThrows(ResponseStatusException.class, () -> service.consume(nonce, nonce));
    }
}
