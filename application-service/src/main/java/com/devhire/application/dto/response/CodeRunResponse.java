package com.devhire.application.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CodeRunResponse(
        UUID id,
        String status,
        String sandboxStatus,
        int visiblePassed,
        int visibleTotal,
        int hiddenPassed,
        int hiddenTotal,
        long executionTimeMs,
        long memoryKb,
        String failureReason,
        double integrityRiskScore,
        double similarityScore,
        List<CodeRunCaseResultResponse> results,
        Instant createdAt,
        Instant completedAt
) {
}
