package com.localpress.identity.service;

import com.localpress.identity.dto.LoginRequest;
import com.localpress.identity.dto.LoginResponse;
import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import com.localpress.shared.device.DeviceLimitReachedException;
import com.localpress.shared.device.DeviceSessionService;
import com.localpress.shared.device.RegisteredSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PasswordLoginServiceTest {
    UserRepository users = mock(UserRepository.class);
    PasswordEncoder passwords = mock(PasswordEncoder.class);
    JwtTokenService tokens = mock(JwtTokenService.class);
    DeviceSessionService devices = mock(DeviceSessionService.class);
    PasswordLoginService service = new PasswordLoginService(users, passwords, tokens, devices);
    User reader;

    @BeforeEach
    void setup() {
        reader = User.createReader("An", "reader.an@gmail.com", "hash", null);
        ReflectionTestUtils.setField(reader, "id", 6L);
        when(users.findByEmail("reader.an@gmail.com")).thenReturn(Optional.of(reader));
        when(passwords.matches("password", "hash")).thenReturn(true);
        when(tokens.lifetimeMillis()).thenReturn(3_600_000L);
        when(devices.register(anyLong(), nullable(String.class), nullable(String.class), nullable(String.class), any()))
                .thenReturn(new RegisteredSession(1L, "sid-6"));
        when(tokens.issue(any(), eq("sid-6"), any())).thenReturn(new LoginResponse("jwt", "Bearer", 3600));
    }

    @Test
    void correctPasswordOpensOneSession() {
        LoginResponse response = service.login(new LoginRequest(" Reader.An@gmail.com ", "password", "Máy tính", "DESKTOP"), "127.0.0.1");
        assertEquals("jwt", response.accessToken());
        verify(devices).register(eq(6L), eq("Máy tính"), eq("DESKTOP"), eq("127.0.0.1"), any());
    }

    @Test
    void wrongPasswordDoesNotOpenSession() {
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> service.login(new LoginRequest("reader.an@gmail.com", "nope", null, null), null)).getStatusCode().value());
        verifyNoInteractions(devices, tokens);
    }

    @Test
    void unknownEmailDoesNotOpenSession() {
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> service.login(new LoginRequest("missing@example.test", "password", null, null), null)).getStatusCode().value());
        verifyNoInteractions(devices, tokens);
    }

    @Test
    void lockedAccountIsForbiddenAfterPasswordMatches() {
        ReflectionTestUtils.setField(reader, "status", User.Status.LOCKED);
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> service.login(new LoginRequest("reader.an@gmail.com", "password", null, null), null)).getStatusCode().value());
        verifyNoInteractions(devices);
    }

    @Test
    void temporaryLockIsForbidden() {
        ReflectionTestUtils.setField(reader, "lockedUntil", LocalDateTime.now().plusMinutes(5));
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> service.login(new LoginRequest("reader.an@gmail.com", "password", null, null), null)).getStatusCode().value());
        verifyNoInteractions(devices);
    }

    @Test
    void deviceLimitPropagates() {
        when(devices.register(anyLong(), nullable(String.class), nullable(String.class), nullable(String.class), any()))
                .thenThrow(new DeviceLimitReachedException());
        assertThrows(DeviceLimitReachedException.class,
                () -> service.login(new LoginRequest("reader.an@gmail.com", "password", null, null), "127.0.0.1"));
        verify(tokens, never()).issue(any(), any(), any());
    }
}
