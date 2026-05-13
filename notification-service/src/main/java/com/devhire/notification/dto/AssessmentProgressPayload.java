package com.devhire.notification.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Payload delivered via WebSocket to the STOMP destination
 * {@code /topic/assessment/{assessmentId}/status} for individual test case progress.
 *
 * <p>Contains all required fields for real-time assessment progress delivery:
 * testCaseIndex, totalTestCases, status, executionTimeMs, and optional errorOutput.</p>
 *
 * <p>Requirements: 6.1, 6.2</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AssessmentProgressPayload(
        String assessmentId,
        int testCaseIndex,
        int totalTestCases,
        String status,
        long executionTimeMs,
        String errorOutput
) {
}
