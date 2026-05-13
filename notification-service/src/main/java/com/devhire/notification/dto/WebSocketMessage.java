package com.devhire.notification.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Represents a message to be delivered via WebSocket/STOMP to a user.
 * Used as the payload for Redis PubSub cross-instance broadcasting.
 *
 * @param type        the message type (e.g., NOTIFICATION, ASSESSMENT_PROGRESS, RANK_CHANGE, PRESENCE)
 * @param destination the STOMP destination to deliver to (e.g., /user/{userId}/notifications)
 * @param payload     the JSON-serialized message body
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record WebSocketMessage(
        String type,
        String destination,
        String payload
) {
}
