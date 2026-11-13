package com.localpress.identity.controller;

import com.localpress.identity.dto.CurrentUserResponse;
import com.localpress.identity.dto.UpdateProfileRequest;
import com.localpress.identity.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * ==============================================================================
 * CONTROLLER: XÁC THỰC VÀ ĐỊNH DANH DÙNG CHUNG (IDENTITY / AUTH - TOÀN HỆ THỐNG)
 * ==============================================================================
 * Cung cấp API /api/v1/auth/me trả về thông tin danh tính của BẤT KỲ VAI TRÒ NÀO
 * (Kế toán, Biên tập viên, Admin, Doanh nghiệp, Độc giả).
 * Tránh lỗi 403 Forbidden do gọi nhầm vào endpoint riêng của Doanh nghiệp (/advertiser/me).
 * Luồng đi: frontend -> AuthController -> ProfileService -> UserProfileRepository -> bảng users, advertisers
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final ProfileService profileService;

    /**
     * GET /api/v1/auth/me
     * Lấy thông tin tài khoản hiện đang đăng nhập thông qua Spring Security context.
     */
    @GetMapping("/me")
    public CurrentUserResponse getCurrentUser(Authentication auth) {
        requireLogin(auth);
        log.info("Xác thực thông tin tài khoản: {}", auth.getName());
        return profileService.getCurrent(auth.getName());
    }

    // PATCH /api/v1/auth/me chỉ đổi họ tên và số điện thoại của phiên hiện tại
    @PatchMapping("/me")
    public CurrentUserResponse updateMe(Authentication auth, @Valid @RequestBody UpdateProfileRequest request) {
        requireLogin(auth);
        profileService.update(auth.getName(), request.fullName(), request.phone());
        return getCurrentUser(auth);
    }

    private static void requireLogin(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
    }
}
