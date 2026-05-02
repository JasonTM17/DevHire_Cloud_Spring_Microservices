package com.devhire.job.dto.response;

import com.devhire.job.entity.JobStatus;

import java.util.UUID;

public record JobInternalResponse(
        UUID id,
        UUID companyId,
        UUID employerId,
        String title,
        JobStatus status,
        boolean published
) {
}

