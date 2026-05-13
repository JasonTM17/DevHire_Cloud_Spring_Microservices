package com.devhire.notification.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.LeaderboardChangedEvent;
import com.devhire.notification.dto.RankChangeEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Kafka consumer for {@code leaderboard.changed} topic events.
 * Publishes rank-change events to the STOMP destination {@code /topic/leaderboard/{assessmentId}}
 * so that clients subscribed to a specific leaderboard context receive updates only for that leaderboard.
 *
 * <p>Implements a 5-second debounce per candidate to prevent message flooding (Requirement 7.4).
 * Uses a {@link ConcurrentHashMap} with timestamps to track the last publish time per candidate.</p>
 *
 * <p>Context filtering is achieved by publishing to assessment-specific STOMP destinations
 * ({@code /topic/leaderboard/{assessmentId}}), so clients only receive events for the
 * leaderboard they are currently viewing (Requirement 7.5).</p>
 *
 * <p>Requirements: 7.1, 7.2, 7.4, 7.5</p>
 */
@Component
public class LeaderboardEventListener {

    private static final Logger log = LoggerFactory.getLogger(LeaderboardEventListener.class);
    private static final long DEBOUNCE_WINDOW_MS = 5_000L;

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Tracks the last publish timestamp per candidateId for debounce enforcement.
     * Key: candidateId (String), Value: epoch milliseconds of last published event.
     */
    private final ConcurrentHashMap<String, Long> lastPublishTimestamps = new ConcurrentHashMap<>();

    public LeaderboardEventListener(SimpMessagingTemplate messagingTemplate,
                                    ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = KafkaTopics.LEADERBOARD_CHANGED,
            groupId = "${spring.kafka.consumer.group-id:notification-service}",
            properties = {
                    "spring.json.value.default.type=com.devhire.common.event.LeaderboardChangedEvent"
            }
    )
    public void onLeaderboardChanged(Object event) {
        if (event instanceof LeaderboardChangedEvent leaderboardEvent) {
            handleLeaderboardChanged(leaderboardEvent);
        } else if (event instanceof Map<?, ?> map) {
            handleMapPayload(map);
        } else {
            log.warn("unsupported_leaderboard_event_payload type={}",
                    event == null ? "null" : event.getClass().getName());
        }
    }

    private void handleMapPayload(Map<?, ?> payload) {
        try {
            LeaderboardChangedEvent event = new LeaderboardChangedEvent(
                    uuid(payload, "eventId"),
                    uuid(payload, "candidateId"),
                    uuid(payload, "assessmentId"),
                    intValue(payload, "newRank"),
                    intValue(payload, "previousRank"),
                    doubleValue(payload, "score"),
                    instant(payload, "occurredAt")
            );
            handleLeaderboardChanged(event);
        } catch (Exception ex) {
            log.error("Failed to parse leaderboard changed map payload: {}", ex.getMessage(), ex);
        }
    }

    private void handleLeaderboardChanged(LeaderboardChangedEvent event) {
        String candidateId = event.candidateId().toString();
        String assessmentId = event.assessmentId().toString();

        // Debounce: skip if we published for this candidate within the last 5 seconds
        if (!shouldPublish(candidateId)) {
            log.debug("Debounced leaderboard event for candidate {} (assessment {})",
                    candidateId, assessmentId);
            return;
        }

        RankChangeEvent rankChangeEvent = new RankChangeEvent(
                candidateId,
                event.newRank(),
                event.previousRank(),
                event.score(),
                assessmentId
        );

        // Publish to assessment-specific destination for context filtering (req 7.5)
        String destination = "/topic/leaderboard/" + assessmentId;

        try {
            String payload = objectMapper.writeValueAsString(rankChangeEvent);
            messagingTemplate.convertAndSend(destination, payload);
            log.debug("Published rank-change event to {} for candidate {} (rank {} -> {})",
                    destination, candidateId, event.previousRank(), event.newRank());
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize rank-change event for candidate {}: {}",
                    candidateId, ex.getMessage(), ex);
        }
    }

    /**
     * Checks whether a rank-change event should be published for the given candidate,
     * enforcing the 5-second debounce window. If the candidate's last publish was more
     * than 5 seconds ago (or never), updates the timestamp and returns true.
     *
     * @param candidateId the candidate identifier
     * @return true if the event should be published, false if debounced
     */
    boolean shouldPublish(String candidateId) {
        long now = Instant.now().toEpochMilli();
        Long lastPublish = lastPublishTimestamps.get(candidateId);

        if (lastPublish == null || (now - lastPublish) >= DEBOUNCE_WINDOW_MS) {
            lastPublishTimestamps.put(candidateId, now);
            return true;
        }
        return false;
    }

    /**
     * Returns the debounce map for testing purposes.
     */
    ConcurrentHashMap<String, Long> getLastPublishTimestamps() {
        return lastPublishTimestamps;
    }

    private static UUID uuid(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        return value instanceof UUID uuid ? uuid : UUID.fromString(String.valueOf(value));
    }

    private static int intValue(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value instanceof Number number) return number.intValue();
        return Integer.parseInt(String.valueOf(value));
    }

    private static double doubleValue(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value instanceof Number number) return number.doubleValue();
        return Double.parseDouble(String.valueOf(value));
    }

    private static Instant instant(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return Instant.now();
        return value instanceof Instant instant ? instant : Instant.parse(String.valueOf(value));
    }
}
