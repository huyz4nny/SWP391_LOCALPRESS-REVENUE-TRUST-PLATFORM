package com.localpress.content.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(assignableTypes = {
        ArticleDraftController.class,
        ArticleDraftSaveController.class,
        ArticleMetadataController.class,
        ArticleMediaController.class,
        ArticleVersionController.class

})
public class ContentExceptionHandler {
    public record ContentErrorResponse(
            String timestamp, int status, String error, String message,
            Map<String, String> fieldErrors
    ) {}

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ContentErrorResponse> handleBusinessError(ResponseStatusException exception) {
        int status = exception.getStatusCode().value();
        HttpStatus httpStatus = HttpStatus.resolve(status);
        return ResponseEntity.status(status).body(new ContentErrorResponse(
                Instant.now().toString(), status,
                httpStatus == null ? "Request Error" : httpStatus.getReasonPhrase(),
                exception.getReason() == null ? "Không thể xử lý yêu cầu bài viết" : exception.getReason(),
                Map.of()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ContentErrorResponse> handleValidationError(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.putIfAbsent("premiumPriceValid".equals(error.getField()) ? "price" : error.getField(),
                        error.getDefaultMessage() == null ? "Dữ liệu không hợp lệ" : error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ContentErrorResponse(
                Instant.now().toString(), 400, "Bad Request",
                "Vui lòng kiểm tra thông tin bài viết", fieldErrors));
    }
}
