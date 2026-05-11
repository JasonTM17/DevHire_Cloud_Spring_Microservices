package com.devhire.application.dto.response;

import java.time.Instant;

public record CodeAssessmentRunnerHealthResponse(
        String status,
        String mode,
        String runnerVersion,
        boolean judge0Configured,
        boolean failClosed,
        boolean networkDisabled,
        long queueDepth,
        String failClosedReason,
        Instant checkedAt,
        Instant lastSmokeAt,
        String lastSmokeStatus,
        String lastSmokeMessage
) {
    public CodeAssessmentRunnerHealthResponse(String status,
                                              String mode,
                                              String runnerVersion,
                                              boolean judge0Configured,
                                              boolean failClosed,
                                              boolean networkDisabled,
                                              long queueDepth,
                                              String failClosedReason,
                                              Instant checkedAt) {
        this(status, mode, runnerVersion, judge0Configured, failClosed, networkDisabled, queueDepth,
                failClosedReason, checkedAt, null, null, null);
    }

    public static CodeAssessmentRunnerHealthResponse unknown(long queueDepth) {
        return new CodeAssessmentRunnerHealthResponse(
                "DOWN",
                "unknown",
                "unknown",
                false,
                true,
                true,
                queueDepth,
                "Runner health has not been checked yet",
                Instant.now());
    }
}
