package com.devhire.notification.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Payload delivered via WebSocket to the STOMP destination
 * {@code /topic/leaderboard/{assessmentId}} when a candidate's rank changes.
 *
 * <p>Contains all required fields for real-time leaderboard rank-change delivery:
 * candidateId, newRank, previousRank, score, and assessmentId.</p>
 *
 * <p>Requirements: 7.1, 7.2</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RankChangeEvent(
        String candidateId,
        int newRank,
        int previousRank,
        double score,
        String assessmentId
) {
}
