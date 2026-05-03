package com.devhire.ai.dto;

import java.time.Instant;
import java.util.UUID;

public record AiConversationSummary(
        UUID id,
        String title,
        String model,
        Instant updatedAt,
        Instant lastMessageAt
) {
}
