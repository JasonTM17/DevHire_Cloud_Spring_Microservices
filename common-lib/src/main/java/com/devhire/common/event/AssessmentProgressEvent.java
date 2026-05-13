package com.devhire.common.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Event published by the assessment-runner-service when a test case completes
 * during code assessment evaluation. Consumed by the notification-service to
 * forward real-time progress updates to subscribed WebSocket clients.
 *
 * <p>When {@code isFinal} is true, the event represents the final summary
 * containing aggregated results (totalPassed, totalFailed, score, overallStatus).</p>
 */
public record AssessmentProgressEvent(
        UUID eventId,
        UUID assessmentId,
        UUID candidateId,
        int testCaseIndex,
        int totalTestCases,
        String status,
        long executionTimeMs,
        String errorOutput,
        boolean isFinal,
        Integer totalPassed,
        Integer totalFailed,
        Double score,
        String overallStatus,
        Instant occurredAt
) {
}
