package com.localpress.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleLoginRequest(
        @NotBlank @Size(max = 16384) String idToken,
        @Size(max = 150) String deviceName,
        @Size(max = 20) String deviceType
) {}
