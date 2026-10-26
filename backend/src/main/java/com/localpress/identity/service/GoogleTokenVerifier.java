package com.localpress.identity.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Set;

@Service
public class GoogleTokenVerifier {
    private final JwtDecoder decoder;
    private final String clientId;

    @Autowired
    public GoogleTokenVerifier(@Value("${localpress.google.client-id:}") String clientId) {
        this(clientId, googleDecoder());
    }

    private static NimbusJwtDecoder googleDecoder() {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3000);
        requestFactory.setReadTimeout(5000);
        return NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .restOperations(new RestTemplate(requestFactory)).build();
    }

    GoogleTokenVerifier(String clientId, NimbusJwtDecoder googleDecoder) {
        this.clientId = clientId;
        googleDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(), jwt -> {
                    String issuer = jwt.getClaimAsString("iss");
                    boolean valid = issuer != null && Set.of("accounts.google.com", "https://accounts.google.com")
                            .contains(issuer)
                            && jwt.getAudience().contains(clientId)
                            && jwt.getExpiresAt() != null && jwt.getIssuedAt() != null;
                    String azp = jwt.getClaimAsString("azp");
                    if (jwt.getAudience().size() > 1 || azp != null) valid &= clientId.equals(azp);
                    return valid ? OAuth2TokenValidatorResult.success() : OAuth2TokenValidatorResult.failure(
                            new OAuth2Error("invalid_token", "Invalid Google token claims", null));
                }));
        this.decoder = googleDecoder;
    }

    public GoogleIdentity verify(String idToken) {
        if (clientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Đăng nhập Google chưa được cấu hình");
        }
        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (BadJwtException | IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thông tin đăng nhập Google không hợp lệ");
        } catch (JwtException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không thể xác minh Google. Vui lòng thử lại");
        }
        String subject = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        String nonce = jwt.getClaimAsString("nonce");
        if (!Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))
                || subject == null || subject.isBlank() || subject.length() > 255
                || email == null || email.isBlank() || email.length() > 255
                || nonce == null || nonce.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google chưa xác minh email hoặc thiếu thông tin đăng nhập");
        }
        String name = jwt.getClaimAsString("name");
        if (name == null || name.isBlank()) name = email.substring(0, email.indexOf('@') > 0 ? email.indexOf('@') : email.length());
        name = name.strip();
        if (name.length() > 150) name = name.substring(0, 150);
        String picture = jwt.getClaimAsString("picture");
        if (picture != null && (!picture.startsWith("https://") || picture.length() > 1000)) picture = null;
        return new GoogleIdentity(subject, email.toLowerCase(Locale.ROOT), name, picture, nonce);
    }

    public record GoogleIdentity(String subject, String email, String name, String picture, String nonce) {}
}
