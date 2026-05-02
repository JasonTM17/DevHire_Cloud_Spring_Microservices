package com.devhire.common.event;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AuditEvent(
        UUID eventId,
        UUID actorId,
        String actorEmail,
        String actorRole,
        String action,
        String resourceType,
        String resourceId,
        Map<String, Object> metadata,
        Instant occurredAt
) {
    public static AuditEvent now(UUID actorId, String actorEmail, String actorRole, String action,
                                 String resourceType, String resourceId, Map<String, Object> metadata) {
        return new AuditEvent(UUID.randomUUID(), actorId, actorEmail, actorRole, action,
                resourceType, resourceId, metadata, Instant.now());
    }
}

