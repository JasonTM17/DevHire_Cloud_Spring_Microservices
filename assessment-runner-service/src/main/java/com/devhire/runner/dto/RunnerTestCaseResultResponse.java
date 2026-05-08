package com.devhire.runner.dto;

import java.util.UUID;

public record RunnerTestCaseResultResponse(
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
