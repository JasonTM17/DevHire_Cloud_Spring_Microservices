package com.devhire.job.dto.response;

import com.devhire.job.entity.JobStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record JobResponse(
        UUID id,
        UUID companyId,
        UUID employerId,
        String title,
        String description,
        String requirements,
        String benefits,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String location,
        String level,
        String type,
        List<String> skills,
        JobStatus status,
        String rejectionReason,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt
) {
}

