package com.devhire.application.client.dto;

import java.util.UUID;

public record JobInternalResponse(
        UUID id,
        UUID companyId,
        UUID employerId,
        String title,
        String status,
        boolean published
) {
}

