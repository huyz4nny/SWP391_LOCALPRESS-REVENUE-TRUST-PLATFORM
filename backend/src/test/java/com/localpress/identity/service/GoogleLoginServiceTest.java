package com.localpress.identity.service;

import com.localpress.identity.dto.LoginResponse;
import com.localpress.identity.entity.User;
import com.localpress.identity.entity.UserIdentity;
import com.localpress.identity.repository.*;
import com.localpress.shared.device.DeviceSessionService;
import com.localpress.shared.device.RegisteredSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GoogleLoginServiceTest {
    GoogleTokenVerifier verifier = mock(GoogleTokenVerifier.class);
    GoogleLoginNonceService nonces = new GoogleLoginNonceService();
    UserIdentityRepository identities = mock(UserIdentityRepository.class);
    UserRepository users = mock(UserRepository.class);
    PasswordEncoder passwords = mock(PasswordEncoder.class);
    JwtTokenService tokens = mock(JwtTokenService.class);
    DeviceSessionService devices = mock(DeviceSessionService.class);
    GoogleLoginService service = new GoogleLoginService(verifier, nonces, identities, users, passwords, tokens, devices);
    String nonce;

    @BeforeEach void setup() {
        nonce = nonces.issue();
        when(verifier.verify("google-token")).thenReturn(new GoogleTokenVerifier.GoogleIdentity(
                "google-sub", "reader@gmail.com", "Reader", "https://example.test/avatar", nonce));
        when(identities.findByProviderAndProviderSubject("GOOGLE", "google-sub")).thenReturn(Optional.empty());
        when(passwords.encode(anyString())).thenReturn("random-hash");
        when(users.saveAndFlush(any())).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            ReflectionTestUtils.setField(user, "id", 42L);
            return user;
        });
        when(devices.register(anyLong(), nullable(String.class), nullable(String.class), nullable(String.class), any()))
                .thenReturn(new RegisteredSession(7L, "sid-test"));
        when(tokens.issue(any(), eq("sid-test"), any())).thenReturn(new LoginResponse("local-token", "Bearer", 3600));
        when(tokens.lifetimeMillis()).thenReturn(3_600_000L);
    }

    User existing() {
        User user = User.createReader("Reader", "reader@gmail.com", "hash", null);
        ReflectionTestUtils.setField(user, "id", 42L);
        when(identities.findByProviderAndProviderSubject("GOOGLE", "google-sub"))
                .thenReturn(Optional.of(UserIdentity.google(42L, "google-sub", "reader@gmail.com")));
        when(users.findById(42L)).thenReturn(Optional.of(user));
        return user;
    }

    @Test void firstLoginCreatesOnlyReaderAndIdentity() {
        assertEquals("local-token", service.login("google-token", nonce).accessToken());
        var captor = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(captor.capture());
        assertEquals(User.Role.READER, captor.getValue().getRole());
        assertEquals(User.Status.ACTIVE, captor.getValue().getStatus());
        assertEquals("random-hash", captor.getValue().getPasswordHash());
        verify(identities).saveAndFlush(any(UserIdentity.class));
    }
    @Test void returningGoogleSubjectDoesNotCreateAnotherUser() {
        existing();
        service.login("google-token", nonce);
        verify(users, never()).saveAndFlush(any());
        verify(identities, never()).saveAndFlush(any());
    }
    @Test void emailCollisionDoesNotAutoLinkOrIssueToken() {
        when(users.existsByEmail("reader@gmail.com")).thenReturn(true);
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> service.login("google-token", nonce)).getStatusCode().value());
        verifyNoInteractions(tokens, devices);
        verify(users, never()).saveAndFlush(any());
    }
    @Test void lockedAccountIsRejected() {
        ReflectionTestUtils.setField(existing(), "status", User.Status.LOCKED);
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> service.login("google-token", nonce)).getStatusCode().value());
        verifyNoInteractions(tokens, devices);
    }
    @Test void temporarilyLockedAccountIsRejected() {
        ReflectionTestUtils.setField(existing(), "lockedUntil", LocalDateTime.now().plusMinutes(5));
        assertThrows(ResponseStatusException.class, () -> service.login("google-token", nonce));
        verifyNoInteractions(tokens, devices);
    }
    @Test void invalidNonceCannotCreateUser() {
        assertThrows(ResponseStatusException.class, () -> service.login("google-token", "other-browser"));
        verifyNoInteractions(users, tokens, devices);
    }
    @Test void successOpensDeviceSessionBeforeIssuingToken() {
        existing();
        assertEquals("local-token", service.login("google-token", nonce, "Máy tính", "DESKTOP", "127.0.0.1").accessToken());
        verify(devices).register(eq(42L), eq("Máy tính"), eq("DESKTOP"), eq("127.0.0.1"), any());
        verify(tokens).issue(any(User.class), eq("sid-test"), any());
    }
}
