package com.localpress.identity;

import com.localpress.identity.controller.AuthController;
import com.localpress.identity.controller.GoogleLoginController;
import com.localpress.identity.controller.GoogleLoginExceptionHandler;
import com.localpress.identity.dto.LoginResponse;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.*;
import com.localpress.shared.security.SecurityConfig;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = { GoogleLoginController.class, AuthController.class }, properties = {
        "localpress.google.client-id=test-client",
        "localpress.jwt.secret=test-signing-key-at-least-32-bytes-long"
})
@Import({SecurityConfig.class, GoogleLoginNonceService.class, GoogleLoginExceptionHandler.class,
        GoogleLoginSecurityTest.WebhookProbeController.class})
class GoogleLoginSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired JwtTokenService tokens;
    @Autowired PasswordEncoder passwords;
    @MockBean GoogleLoginService login;
    @MockBean JdbcTemplate jdbc;
    ResultSet account;
    User reader;

    @BeforeEach void setup() throws Exception {
        reader = User.createReader("Reader", "reader@gmail.com", "hash", null);
        ReflectionTestUtils.setField(reader, "id", 42L);
        account = mock(ResultSet.class);
        when(account.getLong("user_id")).thenReturn(42L);
        when(account.getString("email")).thenReturn("reader@gmail.com");
        when(account.getString("full_name")).thenReturn("Reader");
        when(account.getString("role")).thenReturn("READER");
        when(account.getString("status")).thenReturn("ACTIVE");
        when(account.getString("password_hash")).thenReturn(passwords.encode("password"));
        doAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            return List.of(mapper.mapRow(account, 0));
        }).when(jdbc).query(anyString(), any(RowMapper.class), any(Object[].class));
    }

    @Test void nonceIsPublicAndCookieIsHttpOnly() throws Exception {
        mvc.perform(get("/api/v1/auth/google/nonce"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nonce").isNotEmpty())
                .andExpect(cookie().httpOnly(GoogleLoginNonceService.COOKIE, true))
                .andExpect(header().string("Cache-Control", "no-store"));
    }
    @Test void googleExchangeIsPublicAndDoesNotCacheToken() throws Exception {
        when(login.login("google-id-token", "nonce")).thenReturn(new LoginResponse("local-token", "Bearer", 3600));
        mvc.perform(post("/api/v1/auth/google").cookie(new Cookie(GoogleLoginNonceService.COOKIE, "nonce"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"idToken\":\"google-id-token\",\"role\":\"SYSTEM_ADMIN\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").value("local-token"))
                .andExpect(header().string("Cache-Control", "no-store"));
        verify(login).login("google-id-token", "nonce");
    }
    @Test void emptyGoogleTokenIsRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"idToken\":\"\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(login);
    }
    @Test void meRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void localJwtAuthenticatesMeWithDatabaseIdentity() throws Exception {
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + tokens.issue(reader).accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("42"))
                .andExpect(jsonPath("$.role").value("READER"));
    }
    @Test void basicAuthenticationStillWorks() throws Exception {
        mvc.perform(get("/api/v1/auth/me").with(httpBasic("reader@gmail.com", "password")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("reader@gmail.com"));
    }

    @Test void webhookWithoutAuthorizationPassesSecurityChain() throws Exception {
        mvc.perform(post("/api/v1/finance/webhook/review-probe"))
                .andExpect(status().isOk()).andExpect(content().string("accepted"));
        verifyNoInteractions(jdbc);
    }

    @Test void webhookWithSepayApiKeyDoesNotEnterJwtAuthentication() throws Exception {
        mvc.perform(post("/api/v1/finance/webhook/review-probe")
                        .header("Authorization", "Apikey test-webhook-key"))
                .andExpect(status().isOk()).andExpect(content().string("accepted"));
        verifyNoInteractions(jdbc);
    }

    // Test-only endpoint: verifies the real security chain, not SePay payload handling.
    @org.springframework.web.bind.annotation.RestController
    static class WebhookProbeController {
        @org.springframework.web.bind.annotation.PostMapping("/api/v1/finance/webhook/review-probe")
        String receive() {
            return "accepted";
        }
    }
    @Test void readerJwtCannotAccessBackoffice() throws Exception {
        mvc.perform(get("/api/v1/editorial/articles").header("Authorization", "Bearer " + tokens.issue(reader).accessToken()))
                .andExpect(status().isForbidden());
    }
    @Test void invalidSignatureIsRejected() throws Exception {
        var otherKey = new JwtTokenService("another-signing-key-at-least-32-bytes", 3600000);
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + otherKey.issue(reader).accessToken()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(jdbc);
    }
    @Test void expiredTokenIsRejected() throws Exception {
        String token = Jwts.builder().issuer("localpress").audience().add("localpress-api").and().subject("42")
                .issuedAt(Date.from(Instant.now().minusSeconds(600)))
                .expiration(Date.from(Instant.now().minusSeconds(120)))
                .signWith(Keys.hmacShaKeyFor("test-signing-key-at-least-32-bytes-long".getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256).compact();
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        verifyNoInteractions(jdbc);
    }
    @Test void existingJwtCannotBypassAccountLock() throws Exception {
        String token = tokens.issue(reader).accessToken();
        when(account.getString("status")).thenReturn("LOCKED");
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
    }
    @Test void existingJwtCannotBypassTemporaryLock() throws Exception {
        when(account.getTimestamp("locked_until")).thenReturn(Timestamp.valueOf(LocalDateTime.now().plusMinutes(5)));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + tokens.issue(reader).accessToken()))
                .andExpect(status().isForbidden());
    }
}
