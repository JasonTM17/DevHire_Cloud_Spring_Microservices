package com.devhire.notification.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Payload delivered via WebSocket to the user's STOMP destination
 * {@code /user/{userId}/notifications}.
 *
 * <p>Contains all required fields for real-time notification delivery:
 * id, type, title, body, createdAt, read, and sequenceNumber.</p>
 *
 * <p>Requirements: 4.3, 13.3</p>
 */
public record NotificationWebSocketPayload(
        UUID id,
        String type,
        String title,
        String body,
        Instant createdAt,
        boolean read,
        long sequenceNumber
) {
}
