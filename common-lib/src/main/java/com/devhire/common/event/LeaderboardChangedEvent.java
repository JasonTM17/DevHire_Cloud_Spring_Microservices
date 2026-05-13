package com.devhire.common.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Event published when a candidate's leaderboard rank changes.
 * Consumed by the notification-service to publish real-time rank-change updates
 * and to invalidate leaderboard cache entries.
 */
public record LeaderboardChangedEvent(
        UUID eventId,
        UUID candidateId,
        UUID assessmentId,
        int newRank,
        int previousRank,
        double score,
        Instant occurredAt
) {
}
