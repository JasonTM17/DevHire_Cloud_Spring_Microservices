package com.devhire.user.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record UpdateProfileRequest(
        @Size(max = 120) String name,
        @Size(max = 160) String title,
        @Size(max = 20) List<@Size(max = 40) String> skills,
        @Size(max = 4000) String experience,
        @Size(max = 4000) String education,
        @Min(0) BigDecimal expectedSalary,
        @Size(max = 120) String companyPosition,
        @Size(max = 500) String contactInfo,
        @Size(max = 500) String avatarUrl
) {
}

