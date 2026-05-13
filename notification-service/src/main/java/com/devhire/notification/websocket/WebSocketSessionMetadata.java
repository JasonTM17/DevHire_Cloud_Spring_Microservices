package com.devhire.notification.websocket;

import java.time.Instant;
import java.util.List;

/**
 * Holds metadata for a WebSocket session stored in Redis.
 * Used for cross-instance session queries and crash recovery.
 *
 * @param sessionId     the unique WebSocket session identifier
 * @param userId        the authenticated user's identifier
 * @param connectedAt   the timestamp when the session was established
 * @param subscriptions the list of STOMP destinations the session is subscribed to
 * @param instanceId    the hostname/pod-id of the notification-service instance hosting this session
 */
public record WebSocketSessionMetadata(
        String sessionId,
        String userId,
        Instant connectedAt,
        List<String> subscriptions,
        String instanceId
) {
    public WebSocketSessionMetadata {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId must not be null or blank");
        }
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("userId must not be null or blank");
        }
        if (connectedAt == null) {
            throw new IllegalArgumentException("connectedAt must not be null");
        }
        if (subscriptions == null) {
            subscriptions = List.of();
        }
        if (instanceId == null || instanceId.isBlank()) {
            throw new IllegalArgumentException("instanceId must not be null or blank");
        }
    }
}
