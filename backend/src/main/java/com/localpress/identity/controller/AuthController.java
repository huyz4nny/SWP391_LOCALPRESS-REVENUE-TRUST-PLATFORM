package com.localpress.identity.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
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
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JdbcTemplate jdbc;

    public record CurrentUserResponse(
            String id,
            String name,
            String email,
            String phone,
            String role,
            String avatarUrl,
            String companyId,
            String companyName,
            boolean isActive
    ) {}

    /**
     * GET /api/v1/auth/me
     * Lấy thông tin tài khoản hiện đang đăng nhập thông qua Spring Security context.
     */
    @GetMapping("/me")
    public CurrentUserResponse getCurrentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }

        log.info("Xác thực thông tin tài khoản: {}", auth.getName());

        return jdbc.query(
                "SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.status, u.avatar_url, " +
                "a.advertiser_id, a.company_name " +
                "FROM users u " +
                "LEFT JOIN advertisers a ON a.user_id = u.user_id " +
                "WHERE u.email = ? AND u.status = 'ACTIVE'",
                (rs, row) -> new CurrentUserResponse(
                        String.valueOf(rs.getLong("user_id")),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getString("phone"),
                        rs.getString("role"),
                        rs.getString("avatar_url"),
                        rs.getString("advertiser_id"),
                        rs.getString("company_name"),
                        true
                ),
                auth.getName()
        ).stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin tài khoản"));
    }
}
