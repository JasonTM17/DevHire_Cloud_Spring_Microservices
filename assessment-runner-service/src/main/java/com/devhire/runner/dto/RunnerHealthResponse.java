package com.devhire.runner.dto;

import java.time.Instant;

public record RunnerHealthResponse(
        String status,
        String mode,
        String runnerVersion,
        boolean judge0Configured,
        boolean failClosed,
        boolean networkDisabled,
        int queueDepth,
        String failClosedReason,
        Instant checkedAt
) {
}
