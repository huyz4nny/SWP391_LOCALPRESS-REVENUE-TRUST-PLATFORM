package com.localpress.identity.service;

import com.localpress.identity.dto.LoginRequest;
import com.localpress.identity.dto.LoginResponse;
import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import com.localpress.shared.device.DeviceSessionService;
import com.localpress.shared.device.RegisteredSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PasswordLoginService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtTokenService tokens;
    private final DeviceSessionService devices;

    @Transactional
    public LoginResponse login(LoginRequest request, String ipAddress) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user = users.findByEmail(email).orElseThrow(this::badCredentials);
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72
                || !passwords.matches(request.password(), user.getPasswordHash())) {
            throw badCredentials();
        }
        if (user.getStatus() != User.Status.ACTIVE
                || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang bị khóa");
        }
        if (user.getId() == null) {
            throw badCredentials();
        }
        return openSession(user, request.deviceName(), request.deviceType(), ipAddress);
    }

    private LoginResponse openSession(User user, String deviceName, String deviceType, String ipAddress) {
        Instant expiresAt = Instant.now().plusMillis(tokens.lifetimeMillis());
        try {
            RegisteredSession session = devices.register(user.getId(), deviceName, deviceType, ipAddress, expiresAt);
            return tokens.issue(user, session.sessionId(), expiresAt);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    exception.getMessage() == null ? "Không tạo được phiên đăng nhập" : exception.getMessage());
        }
    }

    private ResponseStatusException badCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác");
    }
}
