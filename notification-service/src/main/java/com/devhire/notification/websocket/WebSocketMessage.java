package com.devhire.notification.websocket;

import java.time.Instant;

/**
 * Represents a message to be delivered via WebSocket to a user.
 * Used as the payload for Redis PubSub cross-instance message delivery.
 */
public record WebSocketMessage(
        String destination,
        String payload,
        Instant timestamp
) {
    public WebSocketMessage(String destination, String payload) {
        this(destination, payload, Instant.now());
    }
}
