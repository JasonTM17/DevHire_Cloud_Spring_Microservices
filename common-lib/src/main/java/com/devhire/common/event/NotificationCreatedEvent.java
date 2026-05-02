package com.devhire.common.event;

import java.time.Instant;
import java.util.UUID;

public record NotificationCreatedEvent(
        UUID eventId,
        UUID notificationId,
        UUID recipientId,
        String type,
        String title,
        Instant occurredAt
) {
}

