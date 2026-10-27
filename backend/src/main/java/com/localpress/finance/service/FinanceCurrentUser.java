package com.localpress.finance.service;

import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * ==============================================================================
 * XÁC ĐỊNH NGƯỜI DÙNG ĐANG ĐĂNG NHẬP CHO PHÂN HỆ FINANCE
 * ==============================================================================
 * Lấy user_id từ SecurityContext (email đăng nhập) thay vì tin header X-User-Id do client gửi.
 * Dùng để chống IDOR (Rule 14): khách chỉ xem/trả được đơn và ví của chính mình.
 * Đọc thẳng bảng users qua JdbcTemplate để không phụ thuộc code nội bộ module identity (Rule 17).
 */
@Component
@RequiredArgsConstructor
public class FinanceCurrentUser {

    private static final Set<String> FINANCE_ROLES = Set.of("ACCOUNTANT", "STAFF", "SYSTEM_ADMIN");

    private final JdbcTemplate jdbcTemplate;

    public record Principal(Long userId, String role) {
        public boolean isFinanceStaff() {
            return FINANCE_ROLES.contains(role);
        }

        /**
         * Chủ đơn hoặc nhân sự tài chính mới được xem đơn. Người khác nhận 403 dù đoán đúng mã đơn.
         */
        public void assertCanAccess(Long ownerUserId) {
            if (!isFinanceStaff() && !userId.equals(ownerUserId)) {
                throw new AppException("Bạn không có quyền truy cập đơn hàng này", HttpStatus.FORBIDDEN);
            }
        }
    }

    public Principal require() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new AppException("Bạn cần đăng nhập để thực hiện thanh toán", HttpStatus.UNAUTHORIZED);
        }
        return jdbcTemplate.query(
                        "SELECT user_id, role FROM users WHERE email = ?",
                        (rs, row) -> new Principal(rs.getLong("user_id"), rs.getString("role")),
                        auth.getName())
                .stream()
                .findFirst()
                .orElseThrow(() -> new AppException("Tài khoản không tồn tại", HttpStatus.UNAUTHORIZED));
    }

    /** Như require() nhưng chỉ cho nhân sự tài chính, người khác nhận 403 với forbiddenMessage. */
    public Principal requireFinanceStaff(String forbiddenMessage) {
        Principal principal = require();
        if (!principal.isFinanceStaff()) {
            throw new AppException(forbiddenMessage, HttpStatus.FORBIDDEN);
        }
        return principal;
    }
}
