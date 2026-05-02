package com.devhire.notification.dto.response;

import com.devhire.notification.entity.EmailStatus;

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
        EmailStatus emailStatus,
        String emailRecipient,
        Instant emailSentAt,
        Instant createdAt
) {
}
