package com.devhire.common.event;

import java.time.Instant;
import java.util.UUID;

public record CompanyReviewedEvent(
        UUID eventId,
        UUID companyId,
        UUID employerId,
        String status,
        Instant occurredAt
) {
}

