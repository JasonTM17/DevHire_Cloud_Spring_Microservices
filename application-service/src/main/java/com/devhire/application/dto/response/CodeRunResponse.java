package com.devhire.application.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CodeRunResponse(
        UUID id,
        String status,
        String sandboxStatus,
        String verdict,
        int visiblePassed,
        int visibleTotal,
        int hiddenPassed,
        int hiddenTotal,
        long executionTimeMs,
        long memoryKb,
        String failureReason,
        String compileOutput,
        String stdout,
        String stderr,
        int timeLimitMs,
        int memoryLimitKb,
        String runnerVersion,
        double integrityRiskScore,
        double similarityScore,
        List<CodeRunCaseResultResponse> results,
        Instant createdAt,
        Instant completedAt
) {
    public CodeRunResponse(UUID id,
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
                           Instant completedAt) {
        this(id, status, sandboxStatus, defaultVerdict(status, visiblePassed + hiddenPassed, visibleTotal + hiddenTotal),
                visiblePassed, visibleTotal, hiddenPassed, hiddenTotal, executionTimeMs, memoryKb, failureReason,
                null, null, null, 0, 0, sandboxStatus, integrityRiskScore, similarityScore, results, createdAt, completedAt);
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
