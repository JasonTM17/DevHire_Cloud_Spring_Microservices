package com.devhire.notification.presence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Aggregates viewer count changes and publishes updates to STOMP subscribers
 * at most once per 10 seconds per job. Uses a scheduled task to flush pending
 * updates, ensuring message volume is limited.
 *
 * <p>Requirements: 9.2, 9.5</p>
 */
@Component
public class ViewerCountPublisher {

    private static final Logger log = LoggerFactory.getLogger(ViewerCountPublisher.class);

    private static final String VIEWERS_TOPIC_PREFIX = "/topic/job/";
    private static final String VIEWERS_TOPIC_SUFFIX = "/viewers";
    static final long DEBOUNCE_INTERVAL_MS = 10_000; // 10 seconds

    private final PresenceTracker presenceTracker;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Tracks pending viewer count updates per jobId.
     * Key: jobId, Value: timestamp when the update was scheduled.
     */
    private final ConcurrentHashMap<String, Long> pendingUpdates = new ConcurrentHashMap<>();

    /**
     * Tracks the last time a viewer count was published per jobId.
     * Key: jobId, Value: epoch millis of last publish.
     */
    private final ConcurrentHashMap<String, Long> lastPublishTime = new ConcurrentHashMap<>();

    public ViewerCountPublisher(
            PresenceTracker presenceTracker,
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper) {
        this.presenceTracker = presenceTracker;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Schedules a viewer count update for the given job. The actual publish
     * will happen on the next scheduled flush cycle, respecting the 10-second
     * debounce window.
     *
     * @param jobId the job identifier whose viewer count changed
     */
    public void scheduleUpdate(String jobId) {
        pendingUpdates.put(jobId, System.currentTimeMillis());
        log.debug("Scheduled viewer count update for job {}", jobId);
    }

    /**
     * Scheduled task that runs every 2 seconds to check for pending updates
     * and publishes viewer counts that haven't been published in the last 10 seconds.
     * This ensures updates are published at most once per 10 seconds per job.
     */
    @Scheduled(fixedRate = 2000)
    public void flushPendingUpdates() {
        if (pendingUpdates.isEmpty()) {
            return;
        }

        long now = System.currentTimeMillis();
        Set<String> jobIds = Set.copyOf(pendingUpdates.keySet());

        for (String jobId : jobIds) {
            Long scheduledAt = pendingUpdates.get(jobId);
            if (scheduledAt == null) {
                continue;
            }

            Long lastPublish = lastPublishTime.get(jobId);
            if (lastPublish != null && (now - lastPublish) < DEBOUNCE_INTERVAL_MS) {
                // Not enough time has passed since last publish — skip for now
                continue;
            }

            // Publish the update
            pendingUpdates.remove(jobId);
            lastPublishTime.put(jobId, now);
            publishViewerCount(jobId);
        }
    }

    /**
     * Publishes the current viewer count for a job to the STOMP topic.
     *
     * @param jobId the job identifier
     */
    private void publishViewerCount(String jobId) {
        try {
            int count = presenceTracker.getViewerCount(jobId);
            String destination = VIEWERS_TOPIC_PREFIX + jobId + VIEWERS_TOPIC_SUFFIX;

            Map<String, Object> payload = Map.of(
                    "contextId", jobId,
                    "count", count
            );

            String json = objectMapper.writeValueAsString(payload);
            messagingTemplate.convertAndSend(destination, json);

            log.debug("Published viewer count for job {}: count={}, destination={}",
                    jobId, count, destination);
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize viewer count for job {}: {}", jobId, ex.getMessage(), ex);
        }
    }

    /**
     * Returns the set of job IDs with pending updates. Useful for testing.
     */
    Set<String> getPendingUpdates() {
        return Set.copyOf(pendingUpdates.keySet());
    }

    /**
     * Returns the last publish time for a job. Useful for testing.
     */
    Long getLastPublishTime(String jobId) {
        return lastPublishTime.get(jobId);
    }
}
