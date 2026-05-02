package com.devhire.company.dto.response;

import com.devhire.company.entity.CompanyStatus;

import java.time.Instant;
import java.util.UUID;

public record CompanyResponse(
        UUID id,
        UUID employerId,
        String name,
        String slug,
        String logoUrl,
        String website,
        String size,
        String industry,
        String description,
        CompanyStatus status,
        String rejectionReason,
        Instant createdAt,
        Instant updatedAt
) {
}

