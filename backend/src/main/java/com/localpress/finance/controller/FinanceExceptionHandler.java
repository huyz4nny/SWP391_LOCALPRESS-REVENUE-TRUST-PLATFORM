package com.localpress.finance.controller;

import com.localpress.shared.exception.AppException;
import com.localpress.shared.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * ==============================================================================
 * EXCEPTION HANDLER RIÊNG CHO PHÂN HỆ FINANCE (SV4 - HUY)
 * ==============================================================================
 * - Phạm vi: Chỉ bắt ngoại lệ phát sinh từ các Controller trong com.localpress.finance.
 * - Tuân thủ Quy tắc 17: Không can thiệp xử lý ngoại lệ của các module khác.
 */
@Slf4j
@RestControllerAdvice(basePackages = "com.localpress.finance")
public class FinanceExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex) {
        log.warn("Ngoại lệ nghiệp vụ tài chính: {}", ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(
            MethodArgumentNotValidException ex
    ) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        log.warn("Dữ liệu đầu vào tài chính không hợp lệ: {}", errors);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<Map<String, String>>builder()
                        .success(false)
                        .message("Dữ liệu gửi lên không hợp lệ")
                        .data(errors)
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception ex) {
        log.error("Lỗi hệ thống không xác định trong phân hệ tài chính: ", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Đã xảy ra lỗi nội bộ trong hệ thống tài chính: " + ex.getMessage()));
    }
}
