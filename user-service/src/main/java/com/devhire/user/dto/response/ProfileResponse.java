package com.devhire.user.dto.response;

import com.devhire.common.security.UserRole;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProfileResponse(
        UUID userId,
        String email,
        UserRole role,
        String name,
        String title,
        List<String> skills,
        String experience,
        String education,
        BigDecimal expectedSalary,
        String companyPosition,
        String contactInfo,
        String avatarUrl,
        Instant createdAt,
        Instant updatedAt
) {
}

