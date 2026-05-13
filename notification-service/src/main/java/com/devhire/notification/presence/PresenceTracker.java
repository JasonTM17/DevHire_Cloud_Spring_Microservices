package com.devhire.notification.presence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Tracks online users via Redis keys with TTL and publishes presence changes
 * to the /topic/presence STOMP destination. Uses Redis sorted sets for viewer
 * count tracking per job context.
 *
 * <p>Requirements: 8.1, 8.2, 8.3, 8.4, 8.5</p>
 */
@Component
public class PresenceTracker {

    private static final Logger log = LoggerFactory.getLogger(PresenceTracker.class);

    private static final String PRESENCE_KEY_PREFIX = "presence:user:";
    private static final String VIEWERS_KEY_PREFIX = "viewers:job:";
    private static final Duration PRESENCE_TTL = Duration.ofSeconds(90);
    private static final String PRESENCE_TOPIC = "/topic/presence";

    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public PresenceTracker(
            StringRedisTemplate redisTemplate,
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Marks a user as online by setting a Redis key with a 90-second TTL.
     * The value is stored as JSON containing the context and connectedAt timestamp.
     * Publishes an online presence change event to the /topic/presence STOMP destination.
     *
     * @param userId  the user identifier
     * @param context the viewing context (e.g., "job:123", "assessment:456")
     */
    public void markOnline(String userId, String context) {
        String key = PRESENCE_KEY_PREFIX + userId;
        String value = serializePresenceValue(context, Instant.now());

        redisTemplate.opsForValue().set(key, value, PRESENCE_TTL);

        log.info("User {} marked online with context: {}", userId, context);
        publishPresenceChange(userId, "online", context);
    }

    /**
     * Marks a user as offline by deleting their presence key from Redis.
     * Publishes an offline presence change event to the /topic/presence STOMP destination.
     *
     * @param userId the user identifier
     */
    public void markOffline(String userId) {
        String key = PRESENCE_KEY_PREFIX + userId;
        redisTemplate.delete(key);

        log.info("User {} marked offline", userId);
        publishPresenceChange(userId, "offline", null);
    }

    /**
     * Refreshes the heartbeat for a user by resetting the TTL on their presence key.
     * Called every 30 seconds by the WebSocket client to maintain online status.
     *
     * @param userId the user identifier
     */
    public void refreshHeartbeat(String userId) {
        String key = PRESENCE_KEY_PREFIX + userId;
        Boolean result = redisTemplate.expire(key, PRESENCE_TTL);

        if (Boolean.TRUE.equals(result)) {
            log.debug("Heartbeat refreshed for user {}", userId);
        } else {
            log.warn("Failed to refresh heartbeat for user {} - key may not exist", userId);
        }
    }

    /**
     * Returns the set of user IDs that are currently online for a given context.
     * Queries Redis for all presence keys and filters by matching context.
     *
     * @param context the viewing context to filter by (e.g., "job:123")
     * @return set of user IDs currently online in the given context
     */
    public Set<String> getOnlineUsers(String context) {
        Set<String> keys = redisTemplate.keys(PRESENCE_KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return Collections.emptySet();
        }

        return keys.stream()
                .filter(key -> {
                    String value = redisTemplate.opsForValue().get(key);
                    if (value == null) {
                        return false;
                    }
                    String storedContext = extractContext(value);
                    return context.equals(storedContext);
                })
                .map(key -> key.substring(PRESENCE_KEY_PREFIX.length()))
                .collect(Collectors.toSet());
    }

    /**
     * Returns the number of viewers for a specific job context using Redis sorted sets.
     * The sorted set uses userId as member and connection timestamp as score.
     *
     * @param contextId the job ID to get viewer count for
     * @return the number of active viewers for the given job
     */
    public int getViewerCount(String contextId) {
        String key = VIEWERS_KEY_PREFIX + contextId;
        Long count = redisTemplate.opsForZSet().zCard(key);
        return count != null ? count.intValue() : 0;
    }

    /**
     * Adds a user as a viewer for a specific job context.
     * Uses a Redis sorted set with the current timestamp as score.
     *
     * @param userId    the user identifier
     * @param contextId the job ID being viewed
     */
    public void addViewer(String userId, String contextId) {
        String key = VIEWERS_KEY_PREFIX + contextId;
        double score = Instant.now().toEpochMilli();
        redisTemplate.opsForZSet().add(key, userId, score);
        log.debug("Added viewer {} to context {}", userId, contextId);
    }

    /**
     * Removes a user from the viewer set for a specific job context.
     *
     * @param userId    the user identifier
     * @param contextId the job ID being viewed
     */
    public void removeViewer(String userId, String contextId) {
        String key = VIEWERS_KEY_PREFIX + contextId;
        redisTemplate.opsForZSet().remove(key, userId);
        log.debug("Removed viewer {} from context {}", userId, contextId);
    }

    /**
     * Returns the set of viewer user IDs for a specific job context.
     *
     * @param contextId the job ID
     * @return set of user IDs currently viewing the job
     */
    public Set<String> getViewers(String contextId) {
        String key = VIEWERS_KEY_PREFIX + contextId;
        Set<ZSetOperations.TypedTuple<String>> tuples = redisTemplate.opsForZSet().rangeWithScores(key, 0, -1);
        if (tuples == null || tuples.isEmpty()) {
            return Collections.emptySet();
        }
        return tuples.stream()
                .map(ZSetOperations.TypedTuple::getValue)
                .collect(Collectors.toSet());
    }

    /**
     * Publishes a presence change event to the /topic/presence STOMP destination.
     * The payload includes userId, status (online/offline), and optional context.
     */
    private void publishPresenceChange(String userId, String status, String context) {
        try {
            Map<String, Object> payload = context != null
                    ? Map.of("userId", userId, "status", status, "context", context)
                    : Map.of("userId", userId, "status", status);

            String json = objectMapper.writeValueAsString(payload);
            messagingTemplate.convertAndSend(PRESENCE_TOPIC, json);
            log.debug("Published presence change to {}: userId={}, status={}", PRESENCE_TOPIC, userId, status);
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize presence change for user {}: {}", userId, ex.getMessage(), ex);
        }
    }

    /**
     * Serializes the presence value as JSON containing context and connectedAt fields.
     */
    private String serializePresenceValue(String context, Instant connectedAt) {
        try {
            Map<String, String> value = Map.of(
                    "context", context,
                    "connectedAt", connectedAt.toString()
            );
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize presence value: {}", ex.getMessage(), ex);
            // Fallback to simple format
            return "{\"context\":\"" + context + "\",\"connectedAt\":\"" + connectedAt + "\"}";
        }
    }

    /**
     * Extracts the context field from a JSON presence value.
     */
    private String extractContext(String jsonValue) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> parsed = objectMapper.readValue(jsonValue, Map.class);
            return parsed.get("context");
        } catch (JsonProcessingException ex) {
            log.warn("Failed to parse presence value: {}", ex.getMessage());
            return null;
        }
    }
}
