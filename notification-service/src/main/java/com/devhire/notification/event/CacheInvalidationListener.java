package com.devhire.notification.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.notification.cache.RedisCacheService;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Kafka consumer that listens for job lifecycle events and leaderboard change events,
 * then invalidates the corresponding Redis cache entries.
 * <p>
 * Cache key patterns:
 * <ul>
 *   <li>{@code cache:jobs:*} — job listing cache (invalidated on job.created, job.updated, job.deleted)</li>
 *   <li>{@code cache:job:{jobId}} — specific job detail cache (invalidated on job.updated, job.deleted)</li>
 *   <li>{@code cache:leaderboard:{assessmentId}} — leaderboard cache (invalidated on leaderboard.changed)</li>
 * </ul>
 * <p>
 * Invalidation is triggered immediately upon event receipt, targeting sub-5-second
 * cache consistency as specified in Requirements 10.3 and 10.4.
 */
@Component
public class CacheInvalidationListener {

    private static final Logger log = LoggerFactory.getLogger(CacheInvalidationListener.class);

    private static final String CACHE_JOBS_PATTERN = "cache:jobs:*";
    private static final String CACHE_JOB_PREFIX = "cache:job:";
    private static final String CACHE_LEADERBOARD_PREFIX = "cache:leaderboard:";

    private final RedisCacheService redisCacheService;

    public CacheInvalidationListener(RedisCacheService redisCacheService) {
        this.redisCacheService = redisCacheService;
    }

    /**
     * Handles job.created events by invalidating all job listing caches.
     * A new job affects listing results, so all listing caches must be cleared.
     */
    @KafkaListener(
            topics = KafkaTopics.JOB_CREATED,
            groupId = "${spring.kafka.consumer.group-id:notification-service}-cache"
    )
    public void onJobCreated(Object event) {
        log.debug("Received job.created event, invalidating job listing caches");
        try {
            redisCacheService.invalidatePattern(CACHE_JOBS_PATTERN);
            log.info("cache_invalidated event=job.created pattern={}", CACHE_JOBS_PATTERN);
        } catch (RuntimeException ex) {
            log.error("cache_invalidation_failed event=job.created pattern={}", CACHE_JOBS_PATTERN, ex);
        }
    }

    /**
     * Handles job.updated events by invalidating the specific job cache and all listing caches.
     * An updated job affects both its detail cache and any listing that includes it.
     */
    @KafkaListener(
            topics = KafkaTopics.JOB_UPDATED,
            groupId = "${spring.kafka.consumer.group-id:notification-service}-cache"
    )
    public void onJobUpdated(Object event) {
        log.debug("Received job.updated event, invalidating job caches");
        try {
            String jobId = extractJobId(event);
            if (jobId != null) {
                redisCacheService.invalidate(CACHE_JOB_PREFIX + jobId);
                log.info("cache_invalidated event=job.updated key={}", CACHE_JOB_PREFIX + jobId);
            }
            redisCacheService.invalidatePattern(CACHE_JOBS_PATTERN);
            log.info("cache_invalidated event=job.updated pattern={}", CACHE_JOBS_PATTERN);
        } catch (RuntimeException ex) {
            log.error("cache_invalidation_failed event=job.updated", ex);
        }
    }

    /**
     * Handles job.deleted events by invalidating the specific job cache and all listing caches.
     * A deleted job must be removed from both its detail cache and any listing.
     */
    @KafkaListener(
            topics = KafkaTopics.JOB_DELETED,
            groupId = "${spring.kafka.consumer.group-id:notification-service}-cache"
    )
    public void onJobDeleted(Object event) {
        log.debug("Received job.deleted event, invalidating job caches");
        try {
            String jobId = extractJobId(event);
            if (jobId != null) {
                redisCacheService.invalidate(CACHE_JOB_PREFIX + jobId);
                log.info("cache_invalidated event=job.deleted key={}", CACHE_JOB_PREFIX + jobId);
            }
            redisCacheService.invalidatePattern(CACHE_JOBS_PATTERN);
            log.info("cache_invalidated event=job.deleted pattern={}", CACHE_JOBS_PATTERN);
        } catch (RuntimeException ex) {
            log.error("cache_invalidation_failed event=job.deleted", ex);
        }
    }

    /**
     * Handles leaderboard.changed events by invalidating the corresponding leaderboard cache.
     */
    @KafkaListener(
            topics = KafkaTopics.LEADERBOARD_CHANGED,
            groupId = "${spring.kafka.consumer.group-id:notification-service}-cache"
    )
    public void onLeaderboardChanged(Object event) {
        log.debug("Received leaderboard.changed event, invalidating leaderboard cache");
        try {
            String assessmentId = extractAssessmentId(event);
            if (assessmentId != null) {
                redisCacheService.invalidate(CACHE_LEADERBOARD_PREFIX + assessmentId);
                log.info("cache_invalidated event=leaderboard.changed key={}",
                        CACHE_LEADERBOARD_PREFIX + assessmentId);
            } else {
                // If we cannot extract the assessmentId, invalidate all leaderboard caches
                redisCacheService.invalidatePattern(CACHE_LEADERBOARD_PREFIX + "*");
                log.info("cache_invalidated event=leaderboard.changed pattern={}",
                        CACHE_LEADERBOARD_PREFIX + "*");
            }
        } catch (RuntimeException ex) {
            log.error("cache_invalidation_failed event=leaderboard.changed", ex);
        }
    }

    /**
     * Extracts the jobId from various event payload formats.
     * Supports ConsumerRecord wrappers, Map payloads, and objects with a jobId field.
     */
    private String extractJobId(Object event) {
        Object payload = unwrapPayload(event);
        if (payload instanceof Map<?, ?> map) {
            Object jobId = map.get("jobId");
            return jobId != null ? jobId.toString() : null;
        }
        // Try reflection for typed event objects with a jobId() method
        return extractField(payload, "jobId");
    }

    /**
     * Extracts the assessmentId from various event payload formats.
     */
    private String extractAssessmentId(Object event) {
        Object payload = unwrapPayload(event);
        if (payload instanceof Map<?, ?> map) {
            Object assessmentId = map.get("assessmentId");
            return assessmentId != null ? assessmentId.toString() : null;
        }
        return extractField(payload, "assessmentId");
    }

    /**
     * Unwraps a ConsumerRecord to get the actual payload value.
     */
    private Object unwrapPayload(Object event) {
        if (event instanceof ConsumerRecord<?, ?> record) {
            return record.value();
        }
        return event;
    }

    /**
     * Attempts to extract a field value from an object using reflection.
     * Supports both record accessor methods (fieldName()) and getter methods (getFieldName()).
     */
    private String extractField(Object payload, String fieldName) {
        if (payload == null) {
            return null;
        }
        try {
            // Try record-style accessor (e.g., jobId())
            var method = payload.getClass().getMethod(fieldName);
            Object value = method.invoke(payload);
            return value != null ? value.toString() : null;
        } catch (NoSuchMethodException e) {
            // Try getter-style accessor (e.g., getJobId())
            try {
                String getterName = "get" + Character.toUpperCase(fieldName.charAt(0)) + fieldName.substring(1);
                var method = payload.getClass().getMethod(getterName);
                Object value = method.invoke(payload);
                return value != null ? value.toString() : null;
            } catch (Exception ex) {
                log.debug("Could not extract field '{}' from event payload type {}",
                        fieldName, payload.getClass().getName());
                return null;
            }
        } catch (Exception e) {
            log.debug("Could not extract field '{}' from event payload type {}",
                    fieldName, payload.getClass().getName());
            return null;
        }
    }
}
