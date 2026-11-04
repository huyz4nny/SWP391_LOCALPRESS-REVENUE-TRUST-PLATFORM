package com.localpress.content.controller;

import com.localpress.content.service.EditorialAiService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/editorial/ai")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('AUTHOR', 'EDITOR', 'SYSTEM_ADMIN')")
public class EditorialAiController {
    private final EditorialAiService service;
    @ExceptionHandler(EditorialAiService.AiException.class)
    public ResponseEntity<Map<String, Object>> handleAiError(EditorialAiService.AiException error) {
        Map<String, Object> body = new java.util.LinkedHashMap<>(Map.of(
                "status", error.getStatusCode().value(),
                "code", error.getCode(),
                "message", error.getReason(),
                "path", "/api/v1/editorial/ai/suggest"));
        if (!error.getDiagnosticId().isEmpty()) body.put("diagnosticId", error.getDiagnosticId());
        return ResponseEntity.status(error.getStatusCode()).body(body);
    }

    public record Request(@NotBlank @Size(max = 1000) String topic) {}
    @PostMapping("/suggest")
    public EditorialAiService.Suggestions suggest(@Valid @RequestBody Request request) {
        return service.suggest(request.topic().strip());
    }
}
