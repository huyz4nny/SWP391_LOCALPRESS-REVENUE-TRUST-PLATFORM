package com.localpress.identity.controller;

import com.localpress.shared.device.DeviceLimitReachedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

// xử lý lỗi chung cho các API xác thực của UC033 (thay cho 4 handler riêng trước đây)
// frontend đang đọc hai kiểu JSON lỗi khác nhau nên giữ nguyên cả hai:
//   - hồ sơ (/auth/me) và đăng ký (/auth/register): {timestamp, status, error, message, fieldErrors}
//   - đăng nhập mật khẩu (/auth/login) và Google (/auth/google): {message} hoặc {message, code},
//     kèm Cache-Control: no-store để trình duyệt không lưu lại phản hồi đăng nhập
// IdentityErrorFormatTest chốt đúng từng định dạng này
@RestControllerAdvice(assignableTypes = {
        AuthController.class,
        ReaderRegistrationController.class,
        PasswordLoginController.class,
        GoogleLoginController.class
})
public class IdentityExceptionHandler {

    public record ErrorResponse(String timestamp, int status, String error, String message,
                                Map<String, String> fieldErrors) {
    }

    // lỗi nghiệp vụ do service ném ra
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> handleBusinessError(ResponseStatusException exception, HandlerMethod handler) {
        String reason = exception.getReason();
        if (isGoogleLogin(handler)) {
            return loginError(exception.getStatusCode(), reason != null ? reason : "Không thể đăng nhập Google");
        }
        if (isPasswordLogin(handler)) {
            return loginError(exception.getStatusCode(), reason != null ? reason : "Không thể đăng nhập");
        }
        return fullError(exception.getStatusCode().value(),
                reason != null ? reason : "Không thể xử lý yêu cầu", Map.of());
    }

    // dữ liệu gửi lên sai ràng buộc @Valid
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationError(MethodArgumentNotValidException exception, HandlerMethod handler) {
        if (isGoogleLogin(handler)) {
            // giữ như cũ: lỗi form Google không gắn no-store
            return ResponseEntity.badRequest().body(Map.of("message", "Thông tin đăng nhập Google không hợp lệ"));
        }
        if (isPasswordLogin(handler)) {
            return ResponseEntity.badRequest().cacheControl(CacheControl.noStore())
                    .body(Map.of("message", "Thông tin đăng nhập không hợp lệ"));
        }
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(fieldError -> fieldErrors.putIfAbsent(
                fieldError.getField(),
                fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "Dữ liệu không hợp lệ"));
        String message = isRegistration(handler)
                ? "Vui lòng kiểm tra thông tin đăng ký"
                : "Dữ liệu gửi lên không hợp lệ";
        return fullError(HttpStatus.BAD_REQUEST.value(), message, fieldErrors);
    }

    // đã đủ 2 phiên đăng nhập, chỉ hai API đăng nhập ném lỗi này
    @ExceptionHandler(DeviceLimitReachedException.class)
    public ResponseEntity<Map<String, String>> handleDeviceLimit(DeviceLimitReachedException exception,
                                                                 HandlerMethod handler) {
        if (!isPasswordLogin(handler) && !isGoogleLogin(handler)) {
            throw exception;
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).cacheControl(CacheControl.noStore())
                .body(Map.of("message", exception.getMessage(), "code", exception.getCode()));
    }

    // hai lần đăng nhập Google đầu tiên chạy cùng lúc: không lộ lỗi DB và không tạo hai tài khoản
    // các API khác ném lại để Spring xử lý như trước (không mượn câu báo lỗi của Google)
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleGoogleLoginRace(DataIntegrityViolationException exception,
                                                                     HandlerMethod handler) {
        if (!isGoogleLogin(handler)) {
            throw exception;
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "Tài khoản vừa được cập nhật. Vui lòng thử đăng nhập lại"));
    }

    private static ResponseEntity<Map<String, String>> loginError(HttpStatusCode status, String message) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(Map.of("message", message));
    }

    private static ResponseEntity<ErrorResponse> fullError(int status, String message, Map<String, String> fieldErrors) {
        HttpStatus httpStatus = HttpStatus.resolve(status);
        String error = httpStatus != null ? httpStatus.getReasonPhrase() : "Request Error";
        return ResponseEntity.status(status)
                .body(new ErrorResponse(Instant.now().toString(), status, error, message, fieldErrors));
    }

    private static boolean isGoogleLogin(HandlerMethod handler) {
        return handler != null && GoogleLoginController.class.isAssignableFrom(handler.getBeanType());
    }

    private static boolean isPasswordLogin(HandlerMethod handler) {
        return handler != null && PasswordLoginController.class.isAssignableFrom(handler.getBeanType());
    }

    private static boolean isRegistration(HandlerMethod handler) {
        return handler != null && ReaderRegistrationController.class.isAssignableFrom(handler.getBeanType());
    }
}
