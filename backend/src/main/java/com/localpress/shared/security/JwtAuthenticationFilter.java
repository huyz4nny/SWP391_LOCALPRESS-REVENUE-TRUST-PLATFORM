package com.localpress.shared.security;

import com.localpress.identity.service.JwtTokenService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

/** Installed only in the Spring Security chain, never as a second servlet filter. */
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenService tokens;
    private final JdbcTemplate jdbc;

    public JwtAuthenticationFilter(JwtTokenService tokens, JdbcTemplate jdbc) {
        this.tokens = tokens;
        this.jdbc = jdbc;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            chain.doFilter(request, response);
            return;
        }
        try {
            long id = tokens.verifyAndGetUserId(header.substring(7));
            // Reload role/lock state on every request; a valid token cannot bypass an account lock.
            var accounts = jdbc.query(
                    "SELECT email, role, status, locked_until FROM users WHERE user_id = ?",
                    (rs, row) -> {
                        var lockedUntil = rs.getTimestamp("locked_until");
                        boolean active = "ACTIVE".equals(rs.getString("status"))
                                && (lockedUntil == null || !lockedUntil.toLocalDateTime().isAfter(LocalDateTime.now()));
                        return new Account(rs.getString("email"), rs.getString("role"), active);
                    }, id);
            if (accounts.isEmpty()) {
                reject(response, 401, "Phiên đăng nhập không hợp lệ");
                return;
            }
            Account account = accounts.get(0);
            if (!account.active()) {
                reject(response, 403, "Tài khoản đang bị khóa");
                return;
            }
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new UsernamePasswordAuthenticationToken(account.email(), null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + account.role()))));
            SecurityContextHolder.setContext(context);
        } catch (JwtException | IllegalArgumentException exception) {
            SecurityContextHolder.clearContext();
            reject(response, 401, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ");
            return;
        }
        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Cache-Control", "no-store");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }

    private record Account(String email, String role, boolean active) {}
}
