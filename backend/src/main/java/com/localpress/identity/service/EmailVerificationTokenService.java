package com.localpress.identity.service;

import lombok.Generated;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class EmailVerificationTokenService {
    private static final int TOKEN_BYTES = 32;
    private static final int EXPIRATION_MINUTES = 15;

    private final SecureRandom secureRandom = new SecureRandom();

    public GeneratedToken generate() {
        byte[] randomBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);

        String rawToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);

        String tokenHash = hash(rawToken);

        LocalDateTime expiresAt = LocalDateTime.now(ZoneOffset.UTC)
                .plusMinutes(EXPIRATION_MINUTES);

        return new GeneratedToken(rawToken, tokenHash, expiresAt);
    }

    public String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hashBytes = digest.digest(
                    rawToken.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "Không thể tạo giá trị băm cho mã xác minh",
                    exception
            );
        }
    }

    public record GeneratedToken(
            String rawToken,
            String tokenHash,
            LocalDateTime expiresAt
    ) {
    }
}
