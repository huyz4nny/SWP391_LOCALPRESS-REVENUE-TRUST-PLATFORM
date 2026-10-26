package com.localpress.reader.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

// bộ xử lý lỗi chỉ áp dụng cho các api /api/v1/reader của SV3 (mua bài, lưu bài, theo dõi chuyên mục)
// mục đích là trả message tiếng Việt trong JSON để frontend hiện được lý do như đã mua rồi hoặc đã có gói
// vì Spring Boot mặc định giấu message của ResponseStatusException
@RestControllerAdvice(assignableTypes = {
        ReaderPurchaseController.class,
        ReaderLibraryController.class,
        ReaderFollowController.class
})
public class ReaderPurchaseExceptionHandler {

    public record ErrorResponse(String timestamp, int status, String error, String message,
                                Map<String, String> fieldErrors) {
    }

    // block đổi lỗi nghiệp vụ như 404 409 401 403 thành JSON có message
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleBusinessError(ResponseStatusException exception) {
        int status = exception.getStatusCode().value();
        HttpStatus httpStatus = HttpStatus.resolve(status);
        String error = httpStatus != null ? httpStatus.getReasonPhrase() : "Request Error";
        String message = exception.getReason() != null ? exception.getReason() : "Không thể xử lý yêu cầu";
        return ResponseEntity.status(status)
                .body(new ErrorResponse(Instant.now().toString(), status, error, message, Map.of()));
    }

    // block đổi lỗi dữ liệu gửi lên sai (thiếu mã hoặc mã không dương) thành 400 kèm lỗi từng trường
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationError(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(fieldError -> fieldErrors.putIfAbsent(
                fieldError.getField(),
                fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "Dữ liệu không hợp lệ"));
        return ResponseEntity.badRequest().body(new ErrorResponse(
                Instant.now().toString(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "Dữ liệu gửi lên không hợp lệ",
                fieldErrors));
    }
}
