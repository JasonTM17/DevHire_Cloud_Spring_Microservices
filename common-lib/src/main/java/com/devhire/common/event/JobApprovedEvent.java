package com.devhire.common.event;

import java.time.Instant;
import java.util.UUID;

public record JobApprovedEvent(
        UUID eventId,
        UUID jobId,
        UUID employerId,
        String title,
        Instant occurredAt
) {
}

