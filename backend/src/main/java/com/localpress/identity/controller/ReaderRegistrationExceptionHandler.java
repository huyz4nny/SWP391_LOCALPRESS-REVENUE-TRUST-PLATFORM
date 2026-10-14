package com.localpress.identity.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(assignableTypes = ReaderRegistrationController.class)
public class ReaderRegistrationExceptionHandler {
    public record RegistrationErrorResponse(
            String timestamp,
            int status,
            String error,
            String message,
            Map<String, String> fieldErrors
    ){
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<RegistrationErrorResponse> handleBusinessError(
            ResponseStatusException exception
    ){
        int status = exception.getStatusCode().value();
        HttpStatus httpStatus = HttpStatus.resolve(status);

        String error = httpStatus != null
                ? httpStatus.getReasonPhrase()
                : "Request Error";

        String message = exception.getReason() != null
                ? exception.getReason()
                : "Không thể xử lý yêu cầu";

        RegistrationErrorResponse body = new RegistrationErrorResponse(
                Instant.now().toString(),
                status,
                error,
                message,
                Map.of()
        );

        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<RegistrationErrorResponse> handleValidationError(
            MethodArgumentNotValidException exception
    ) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        exception.getBindingResult()
                .getFieldErrors()
                .forEach(fieldError -> fieldErrors.putIfAbsent(
                        fieldError.getField(),
                        fieldError.getDefaultMessage() != null
                                ? fieldError.getDefaultMessage()
                                : "Dữ liệu không hợp lệ"
                ));

        RegistrationErrorResponse body = new RegistrationErrorResponse(
                Instant.now().toString(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "Vui lòng kiểm tra thông tin đăng ký",
                fieldErrors
        );
        return ResponseEntity.badRequest().body(body);
    }
}
