package com.localpress.shared.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Cấu hình bảo mật tập trung cho toàn bộ hệ thống LocalPress Backend (Spring Boot 3 + Spring Security 6).
 *
 * Trách nhiệm quản lý của Leader (SV4):
 * 1. CORS & CSRF: Cho phép Frontend React (localhost:5173) gọi API qua CorsFilter, tắt CSRF cho REST API.
 * 2. Phân quyền Endpoint Granular RBAC theo chuẩn SRS/SDS:
 *    - Public: Tin tức Free, chuyên mục, danh mục slot QC, webhook cổng thanh toán IPN.
 *    - Phân hệ Quảng cáo (SV1): Yêu cầu Role ADVERTISER hoặc SYSTEM_ADMIN.
 *    - Phân hệ Biên tập tòa soạn (SV2): Yêu cầu Role EDITOR, STAFF hoặc SYSTEM_ADMIN.
 *    - Phân hệ Tài chính kế toán (SV4): Yêu cầu Role ACCOUNTANT, STAFF hoặc SYSTEM_ADMIN.
 *    - Phân hệ Quản trị (SV5): Yêu cầu Role SYSTEM_ADMIN.
 * 3. Xác thực người dùng (Authentication):
 *    - Hỗ trợ HTTP Basic Auth (phục vụ test tự động và tích hợp ban đầu).
 *    - UserDetailsService đọc trực tiếp từ bảng 'users' (MySQL), xác thực mật khẩu mã hóa BCrypt.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 1. Preflight CORS requests từ trình duyệt
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // 2. Tài nguyên công khai & Tài liệu kỹ thuật
                        .requestMatchers("/error", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // 3. API Độc giả & Khách vãng lai đọc Free 100% (Rule 1) + path Reader SV3
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/reader/articles",
                                "/api/v1/reader/articles/**",
                                "/api/v1/articles/**",
                                "/api/v1/categories/**",
                                "/api/v1/comments/**",
                                "/api/v1/subscription-plans/**"
                        ).permitAll()

                        // 4. API Tra cứu vị trí quảng cáo công khai cho Doanh nghiệp (SV1 - UC003)
                        .requestMatchers(HttpMethod.GET, "/api/v1/ad-slots/**").permitAll()

                        // 5. Cổng xác thực & Webhook IPN cổng thanh toán (SV4 - Rule 4, 5)
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/finance/webhook/**").permitAll()

                        // 6. Phân hệ B2B Quảng cáo (SV1 - Tây)
                        .requestMatchers("/api/v1/advertiser/**").hasAnyRole("ADVERTISER", "SYSTEM_ADMIN")

                        // 7. Phân hệ Tòa soạn & Biên tập (SV2 - Trọng Phan)
                        .requestMatchers("/api/v1/editorial/**").hasAnyRole("EDITOR", "STAFF", "SYSTEM_ADMIN")

                        // 8. Phân hệ Kế toán, Thanh toán & Đối soát (SV4 - Huy Leader)
                        .requestMatchers("/api/v1/finance/**").hasAnyRole("ACCOUNTANT", "STAFF", "SYSTEM_ADMIN")

                        // 9. Phân hệ Quản trị hệ thống & Cấu hình nền tảng (SV5 - Tùng)
                        .requestMatchers("/api/v1/admin/**", "/api/v1/administration/**").hasRole("SYSTEM_ADMIN")

                        // Mọi endpoint còn lại bắt buộc phải xác thực
                        .anyRequest().authenticated()
                )
                .httpBasic(Customizer.withDefaults())
                .build();
    }

    @Bean
    public UserDetailsService userDetailsService(JdbcTemplate jdbc) {
        return email -> jdbc.query(
                "SELECT email, password_hash, role, status FROM users WHERE email = ?",
                (rs, row) -> User.withUsername(rs.getString("email"))
                        .password(rs.getString("password_hash"))
                        .roles(rs.getString("role"))
                        .accountLocked(!"ACTIVE".equals(rs.getString("status")))
                        .build(), email).stream().findFirst()
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản với email: " + email));
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
