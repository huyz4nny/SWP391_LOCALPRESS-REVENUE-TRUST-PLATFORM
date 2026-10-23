package com.localpress.identity.service;

import com.localpress.identity.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenServiceTest {
    private static final String SECRET = "test-stable-signing-key-at-least-32-bytes";

    @Test void configuredKeySurvivesServiceRestartAndIssues24HourTokens() {
        User user = User.createReader("Reader", "reader@example.test", "unused", null);
        ReflectionTestUtils.setField(user, "id", 42L);
        var firstInstance = new JwtTokenService(SECRET, 86400000);
        var token = firstInstance.issue(user);
        var restartedInstance = new JwtTokenService(SECRET, 86400000);

        assertEquals(86400L, token.expiresIn());
        assertEquals(42L, restartedInstance.verifyAndGetUserId(token.accessToken()));
    }

    @Test void missingSecretFailsInsteadOfSilentlyGeneratingANewKey() {
        assertThrows(IllegalArgumentException.class, () -> new JwtTokenService(null, 86400000));
        assertThrows(IllegalArgumentException.class, () -> new JwtTokenService("  ", 86400000));
    }
}
