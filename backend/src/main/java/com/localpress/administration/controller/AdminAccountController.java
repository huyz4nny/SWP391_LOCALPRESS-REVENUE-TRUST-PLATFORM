package com.localpress.administration.controller;
import com.localpress.administration.service.AdminAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
@RequiredArgsConstructor
public class AdminAccountController {
    private final AdminAccountService service;
    public record Input(String action,String reason) {}
    @PostMapping("/{id}/account-action")
    public AdminAccountService.Result action(Authentication auth,@PathVariable long id,@RequestBody Input input,HttpServletRequest request) {
        return service.change(auth,id,input.action(),input.reason(),request.getRemoteAddr());
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String,Object>> error(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"Không thể xử lý yêu cầu.":e.getReason()));
    }
}
