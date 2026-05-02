package com.devhire.application.dto.response;

import com.devhire.application.entity.ApplicationStatus;

import java.time.Instant;
import java.util.UUID;

public record ApplicationResponse(
        UUID id,
        UUID jobId,
        UUID companyId,
        UUID employerId,
        UUID candidateId,
        String jobTitle,
        String cvUrl,
        String coverLetter,
        ApplicationStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}

