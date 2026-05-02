package com.devhire.audit.dto.response;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        UUID eventId,
        UUID actorId,
        String actorEmail,
        String actorRole,
        String action,
        String resourceType,
        String resourceId,
        Map<String, Object> metadata,
        Instant occurredAt,
        Instant createdAt
) {
}
