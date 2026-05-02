package com.devhire.auth.dto.response;

import com.devhire.common.security.UserRole;

import java.time.Instant;
import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String email,
        UserRole role,
        String accessToken,
        String refreshToken,
        Instant accessTokenExpiresAt,
        Instant refreshTokenExpiresAt
) {
}

