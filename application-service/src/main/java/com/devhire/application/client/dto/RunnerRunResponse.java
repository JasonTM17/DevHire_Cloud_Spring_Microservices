package com.devhire.application.client.dto;

import java.time.Instant;
import java.util.List;

public record RunnerRunResponse(
        String status,
        String sandboxStatus,
        String verdict,
        int passed,
        int total,
        long executionTimeMs,
        long memoryKb,
        String failureReason,
        String compileOutput,
        String stdout,
        String stderr,
        int timeLimitMs,
        int memoryLimitKb,
        String runnerVersion,
        List<RunnerTestCaseResultResponse> results,
        Instant completedAt
) {
    public RunnerRunResponse(String status,
                             String sandboxStatus,
                             int passed,
                             int total,
                             long executionTimeMs,
                             long memoryKb,
                             String failureReason,
                             List<RunnerTestCaseResultResponse> results,
                             Instant completedAt) {
        this(status, sandboxStatus, defaultVerdict(status, passed, total), passed, total, executionTimeMs, memoryKb,
                failureReason, null, null, null, 0, 0, sandboxStatus, results, completedAt);
    }

    private static String defaultVerdict(String status, int passed, int total) {
        if ("POLICY_BLOCKED".equals(status)) {
            return "POLICY_BLOCKED";
        }
        if ("FAILED".equals(status)) {
            return "RUNNER_UNAVAILABLE";
        }
        return total > 0 && passed == total ? "ACCEPTED" : "WRONG_ANSWER";
    }
}
