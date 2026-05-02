package com.devhire.notification.dto.response;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        UUID recipientId,
        String type,
        String title,
        String message,
        boolean read,
        Instant readAt,
        Instant createdAt
) {
}
