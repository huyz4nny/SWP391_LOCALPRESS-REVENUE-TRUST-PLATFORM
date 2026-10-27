package com.localpress.identity.dto;

public record LoginResponse(String accessToken, String tokenType, long expiresIn) {}
