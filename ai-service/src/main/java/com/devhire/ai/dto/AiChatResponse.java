package com.devhire.ai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AiChatResponse(
        UUID conversationId,
        String answer,
        List<AiCitation> citations,
        List<AiToolTrace> toolTraces,
        String model,
        boolean fallback,
        Instant createdAt
) {
}
