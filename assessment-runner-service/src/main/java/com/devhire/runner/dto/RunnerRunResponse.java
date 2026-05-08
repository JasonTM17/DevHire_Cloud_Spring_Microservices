package com.devhire.runner.dto;

import java.time.Instant;
import java.util.List;

public record RunnerRunResponse(
        String status,
        String sandboxStatus,
        int passed,
        int total,
        long executionTimeMs,
        long memoryKb,
        String failureReason,
        List<RunnerTestCaseResultResponse> results,
        Instant completedAt
) {
}
