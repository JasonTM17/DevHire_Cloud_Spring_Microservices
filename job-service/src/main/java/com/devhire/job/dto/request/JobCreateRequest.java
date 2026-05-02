package com.devhire.job.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record JobCreateRequest(
        @NotNull UUID companyId,
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 8000) String description,
        @Size(max = 8000) String requirements,
        @Size(max = 4000) String benefits,
        @Min(0) BigDecimal salaryMin,
        @Min(0) BigDecimal salaryMax,
        @Size(max = 160) String location,
        @Size(max = 80) String level,
        @Size(max = 80) String type,
        @Size(max = 20) List<@Size(max = 40) String> skills
) {
}

