package com.devhire.job.client.dto;

import java.util.UUID;

public record CompanyInternalResponse(
        UUID id,
        UUID employerId,
        String status,
        boolean approved
) {
}

