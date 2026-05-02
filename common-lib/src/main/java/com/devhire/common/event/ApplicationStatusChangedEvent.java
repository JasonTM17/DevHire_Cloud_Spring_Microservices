package com.devhire.common.event;

import java.time.Instant;
import java.util.UUID;

public record ApplicationStatusChangedEvent(
        UUID eventId,
        UUID applicationId,
        UUID jobId,
        UUID candidateId,
        UUID employerId,
        String oldStatus,
        String newStatus,
        Instant occurredAt
) {
}

