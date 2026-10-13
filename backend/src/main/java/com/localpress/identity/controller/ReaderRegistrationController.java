package com.localpress.identity.controller;

import com.localpress.identity.dto.RegisterReaderRequest;
import com.localpress.identity.dto.RegisterReaderResponse;
import com.localpress.identity.service.ReaderRegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class ReaderRegistrationController {
    private final ReaderRegistrationService registrationService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterReaderResponse register(@Valid @RequestBody RegisterReaderRequest request) {
        return registrationService.register(request);
    }
}
