package com.localpress.identity.dto;

public record RegisterReaderResponse(
        String id,
        String email,
        String role,
        String status
) {
}
