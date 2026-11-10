package com.localpress.identity.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestControllerAdvice(assignableTypes = GoogleLoginController.class)
public class GoogleLoginExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).cacheControl(CacheControl.noStore())
                .body(Map.of("message", exception.getReason() == null ? "Không thể đăng nhập Google" : exception.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validation() {
        return ResponseEntity.badRequest().body(Map.of("message", "Thông tin đăng nhập Google không hợp lệ"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> conflict() {
        // A concurrent first login/email registration must not leak DB errors or create two accounts.
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message",
                "Tài khoản vừa được cập nhật. Vui lòng thử đăng nhập lại"));
    }
}
