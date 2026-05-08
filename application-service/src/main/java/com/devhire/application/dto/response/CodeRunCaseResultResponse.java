package com.devhire.application.dto.response;

import java.util.UUID;

public record CodeRunCaseResultResponse(
        UUID caseId,
        String name,
        String visibility,
        boolean passed,
        String output,
        String error,
        long executionTimeMs,
        long memoryKb
) {
}
