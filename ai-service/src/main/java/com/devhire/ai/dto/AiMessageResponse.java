package com.devhire.ai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AiMessageResponse(
        UUID id,
        String role,
        String content,
        boolean fallback,
        List<AiCitation> citations,
        List<AiToolTrace> toolTraces,
        Instant createdAt
) {
}
