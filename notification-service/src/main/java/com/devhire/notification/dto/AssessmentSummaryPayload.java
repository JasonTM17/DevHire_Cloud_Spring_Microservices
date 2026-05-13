package com.devhire.notification.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Payload delivered via WebSocket to the STOMP destination
 * {@code /topic/assessment/{assessmentId}/status} as the final summary event
 * when all test cases have completed.
 *
 * <p>Contains aggregated results: totalPassed, totalFailed, score, and overallStatus.</p>
 *
 * <p>Requirements: 6.4</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AssessmentSummaryPayload(
        String assessmentId,
        int totalPassed,
        int totalFailed,
        double score,
        String overallStatus
) {
}
