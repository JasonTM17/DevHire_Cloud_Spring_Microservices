package com.devhire.ai.dto;

import java.time.Instant;

public record AiProviderStatusResponse(
        String provider,
        String model,
        String baseUrlHost,
        String anthropicVersion,
        int maxTokens,
        boolean apiKeyConfigured,
        boolean demoFallbackEnabled,
        String mode,
        Instant checkedAt
) {
}
