package com.devhire.notification.client.dto;

import com.devhire.common.security.UserRole;

import java.util.UUID;

public record ProfileResponse(
        UUID userId,
        String email,
        UserRole role,
        String name
) {
}
