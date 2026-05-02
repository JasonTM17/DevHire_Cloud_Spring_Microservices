package com.devhire.common.event;

import java.time.Instant;
import java.util.UUID;

public record ApplicationSubmittedEvent(
        UUID eventId,
        UUID applicationId,
        UUID jobId,
        UUID candidateId,
        UUID employerId,
        String jobTitle,
        Instant occurredAt
) {
}

