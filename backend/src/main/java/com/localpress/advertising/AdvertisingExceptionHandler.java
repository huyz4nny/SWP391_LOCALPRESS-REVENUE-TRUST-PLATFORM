package com.localpress.advertising;

import com.localpress.shared.exception.AppException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/** Trả {message, fieldErrors} để httpClient của frontend hiện đúng lỗi tiếng Việt. */
@RestControllerAdvice(assignableTypes = AdBookingController.class)
public class AdvertisingExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode())
                .body(Map.of("message", Objects.toString(error.getReason(), "Yêu cầu không hợp lệ")));
    }

    /** Lỗi từ bộ xử lý thanh toán dùng chung của finance. */
    @ExceptionHandler(AppException.class)
    public ResponseEntity<Map<String, Object>> app(AppException error) {
        return ResponseEntity.status(error.getStatus()).body(Map.of("message", error.getMessage()));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Map<String, Object>> duplicate() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "Yêu cầu này đã được gửi, vui lòng tải lại danh sách booking"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException error) {
        return ResponseEntity.badRequest().body(Map.of("message", "Thông tin gửi lên không hợp lệ", "fieldErrors",
                error.getBindingResult().getFieldErrors().stream().collect(Collectors.toMap(
                        field -> field.getField(),
                        field -> Objects.toString(field.getDefaultMessage(), "Dữ liệu không hợp lệ"),
                        (first, duplicate) -> first))));
    }
}
