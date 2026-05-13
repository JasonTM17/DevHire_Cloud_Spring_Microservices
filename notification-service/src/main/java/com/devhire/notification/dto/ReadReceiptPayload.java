package com.devhire.notification.dto;

import java.util.UUID;

/**
 * Payload delivered via WebSocket to the user's STOMP destination when a notification
 * is marked as read. Enables cross-tab synchronization of read state so that all
 * open browser tabs for the same user reflect the updated read status.
 *
 * <p>Requirements: 5.4</p>
 */
public record ReadReceiptPayload(
        UUID notificationId,
        boolean read
) {
}
