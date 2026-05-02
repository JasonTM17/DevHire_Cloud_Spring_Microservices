package com.devhire.auth.dto.request;

import com.devhire.common.security.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email @NotBlank String email,
        @Size(min = 8, max = 100) String password,
        @NotNull UserRole role
) {
}

