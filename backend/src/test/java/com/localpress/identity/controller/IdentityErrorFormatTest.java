package com.localpress.identity.controller;

import com.localpress.identity.service.GoogleLoginNonceService;
import com.localpress.identity.service.GoogleLoginService;
import com.localpress.identity.service.PasswordLoginService;
import com.localpress.identity.service.ProfileService;
import com.localpress.identity.service.ReaderRegistrationService;
import com.localpress.shared.device.DeviceLimitReachedException;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// chốt định dạng JSON lỗi mà frontend đang đọc ở các API của identity (UC033)
// hai kiểu lỗi:
//   - hồ sơ và đăng ký: {timestamp, status, error, message, fieldErrors}
//   - đăng nhập mật khẩu và Google: {message} hoặc {message, code}, kèm Cache-Control: no-store
class IdentityErrorFormatTest {

    ProfileService profiles = mock(ProfileService.class);
    ReaderRegistrationService registrations = mock(ReaderRegistrationService.class);
    PasswordLoginService passwordLogin = mock(PasswordLoginService.class);
    GoogleLoginService googleLogin = mock(GoogleLoginService.class);
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        GoogleLoginController google = new GoogleLoginController(googleLogin, mock(GoogleLoginNonceService.class));
        ReflectionTestUtils.setField(google, "clientId", "");
        mvc = MockMvcBuilders.standaloneSetup(
                        new AuthController(profiles),
                        new ReaderRegistrationController(registrations),
                        new PasswordLoginController(passwordLogin),
                        google)
                .setControllerAdvice(
                        new IdentityExceptionHandler())
                .build();
    }

    // ---------- hồ sơ: GET/PATCH /auth/me ----------

    @Test
    void meWithoutLoginReturnsFullErrorBody() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Chưa đăng nhập"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.fieldErrors").isEmpty());
    }

    @Test
    void invalidProfileReturnsFieldErrors() throws Exception {
        mvc.perform(patch("/api/v1/auth/me").contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Dữ liệu gửi lên không hợp lệ"))
                .andExpect(jsonPath("$.fieldErrors.fullName").value("Vui lòng nhập họ tên"));
    }

    @Test
    void profileBusinessErrorKeepsReason() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng"))
                .when(profiles).update(anyString(), anyString(), any());
        mvc.perform(patch("/api/v1/auth/me")
                        .principal(new UsernamePasswordAuthenticationToken("reader@test.vn", null, List.of()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"An\",\"phone\":\"0912345678\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("Số điện thoại đã được sử dụng"));
    }

    // ---------- đăng ký: POST /auth/register ----------

    @Test
    void invalidRegistrationReturnsFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Vui lòng kiểm tra thông tin đăng ký"))
                .andExpect(jsonPath("$.fieldErrors.email").value("Vui lòng nhập email"));
    }

    @Test
    void registrationBusinessErrorKeepsReason() throws Exception {
        when(registrations.register(any())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được sử dụng"));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(validRegistration()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Email đã được sử dụng"));
    }

    @Test
    void registrationDatabaseErrorIsNotTurnedIntoLoginMessage() {
        when(registrations.register(any())).thenThrow(new DataIntegrityViolationException("boom"));
        assertThrows(ServletException.class, () -> mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(validRegistration())));
    }

    // ---------- đăng nhập mật khẩu: POST /auth/login ----------

    @Test
    void invalidPasswordLoginReturnsMessageOnly() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.message").value("Thông tin đăng nhập không hợp lệ"))
                .andExpect(jsonPath("$.status").doesNotExist());
    }

    @Test
    void passwordLoginDeviceLimitReturnsCode() throws Exception {
        when(passwordLogin.login(any(), any())).thenThrow(new DeviceLimitReachedException());
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(validLogin()))
                .andExpect(status().isConflict())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value(DeviceLimitReachedException.CODE))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void passwordLoginErrorWithoutReasonUsesDefaultMessage() throws Exception {
        when(passwordLogin.login(any(), any())).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(validLogin()))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.message").value("Không thể đăng nhập"));
    }

    // ---------- đăng nhập Google: /auth/google ----------

    @Test
    void invalidGoogleLoginReturnsMessageWithoutCacheHeader() throws Exception {
        mvc.perform(post("/api/v1/auth/google").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().doesNotExist("Cache-Control"))
                .andExpect(jsonPath("$.message").value("Thông tin đăng nhập Google không hợp lệ"));
    }

    @Test
    void googleNonceWithoutClientIdUsesReason() throws Exception {
        mvc.perform(get("/api/v1/auth/google/nonce"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.message").value("Đăng nhập Google chưa được cấu hình"));
    }

    @Test
    void googleLoginErrorWithoutReasonUsesDefaultMessage() throws Exception {
        when(googleLogin.login(any(), any(), any(), any(), any())).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        mvc.perform(post("/api/v1/auth/google").contentType(MediaType.APPLICATION_JSON).content(validGoogle()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Không thể đăng nhập Google"));
    }

    @Test
    void googleLoginDeviceLimitReturnsCode() throws Exception {
        when(googleLogin.login(any(), any(), any(), any(), any())).thenThrow(new DeviceLimitReachedException());
        mvc.perform(post("/api/v1/auth/google").contentType(MediaType.APPLICATION_JSON).content(validGoogle()))
                .andExpect(status().isConflict())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value(DeviceLimitReachedException.CODE));
    }

    @Test
    void googleLoginRaceReturnsConflictMessage() throws Exception {
        when(googleLogin.login(any(), any(), any(), any(), any())).thenThrow(new DataIntegrityViolationException("dup"));
        mvc.perform(post("/api/v1/auth/google").contentType(MediaType.APPLICATION_JSON).content(validGoogle()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Tài khoản vừa được cập nhật. Vui lòng thử đăng nhập lại"));
    }

    private static String validRegistration() {
        return "{\"fullName\":\"An\",\"email\":\"an@test.vn\",\"password\":\"secret123\"}";
    }

    private static String validLogin() {
        return "{\"email\":\"an@test.vn\",\"password\":\"secret123\"}";
    }

    private static String validGoogle() {
        return "{\"idToken\":\"token\"}";
    }
}
