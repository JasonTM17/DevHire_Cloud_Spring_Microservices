package com.devhire.auth.dto.response;

import com.devhire.common.security.UserRole;

import java.util.UUID;

public record MeResponse(UUID id, String email, UserRole role) {
}

