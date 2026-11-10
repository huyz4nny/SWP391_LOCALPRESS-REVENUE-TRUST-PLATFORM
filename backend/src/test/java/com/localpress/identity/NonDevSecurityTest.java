package com.localpress.identity;

import com.localpress.identity.controller.AuthController;
import com.localpress.identity.service.JwtTokenService;
import com.localpress.identity.service.ProfileService;
import com.localpress.shared.device.DeviceSessionService;
import com.localpress.shared.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.ResultSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Ngoài profile dev (hai cờ localpress.security.* tắt): không có HTTP Basic, không hoán đổi mật khẩu seed. */
@WebMvcTest(controllers = AuthController.class, properties = {
        "localpress.jwt.secret=test-signing-key-at-least-32-bytes-long",
        "localpress.security.http-basic=false",
        "localpress.security.seed-password-alias=false"
})
@Import(SecurityConfig.class)
class NonDevSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired PasswordEncoder passwords;
    @MockBean ProfileService profileService;
    @MockBean JdbcTemplate jdbc;
    @MockBean DeviceSessionService devices;
    @MockBean JwtTokenService tokens;

    @Test void basicAuthenticationIsRejected() throws Exception {
        // Tài khoản có thật, đúng mật khẩu: nếu Basic còn bật thì request này sẽ qua (200)
        ResultSet account = mock(ResultSet.class);
        when(account.getString("email")).thenReturn("reader@gmail.com");
        when(account.getString("password_hash")).thenReturn(passwords.encode("password"));
        when(account.getString("role")).thenReturn("READER");
        when(account.getString("status")).thenReturn("ACTIVE");
        doAnswer(invocation -> List.of(invocation.<RowMapper<?>>getArgument(1).mapRow(account, 0)))
                .when(jdbc).query(anyString(), any(RowMapper.class), any(Object[].class));
        mvc.perform(get("/api/v1/auth/me").with(httpBasic("reader@gmail.com", "password")))
                .andExpect(status().isUnauthorized());
    }

    @Test void anonymousRequestStillGets401NotForbidden() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test void seedPasswordsAreNotInterchangeable() {
        assertFalse(passwords.matches("password", passwords.encode("password123")));
        assertFalse(passwords.matches("password123", passwords.encode("password")));
        assertTrue(passwords.matches("password123", passwords.encode("password123")));
    }
}
