package com.devhire.notification.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stores WebSocket session metadata in Redis for cross-instance queries and crash recovery.
 * Each session is stored as a Redis hash with key pattern {@code ws:session:{sessionId}}
 * and a TTL of 3600 seconds (refreshed every 300 seconds).
 *
 * <p>Requirements: 11.1, 11.2, 11.3, 11.5</p>
 */
@Component
public class WebSocketSessionCache {

    private static final Logger log = LoggerFactory.getLogger(WebSocketSessionCache.class);

    static final String KEY_PREFIX = "ws:session:";
    static final Duration SESSION_TTL = Duration.ofSeconds(3600);
    static final String FIELD_USER_ID = "userId";
    static final String FIELD_CONNECTED_AT = "connectedAt";
    static final String FIELD_SUBSCRIPTIONS = "subscriptions";
    static final String FIELD_INSTANCE_ID = "instanceId";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final String instanceId;

    /**
     * Local tracking of session IDs managed by this instance, used for TTL refresh scheduling.
     */
    private final Set<String> localSessionIds = ConcurrentHashMap.newKeySet();

    public WebSocketSessionCache(
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Value("${devhire.websocket.instance-id:${HOSTNAME:${spring.application.name}}}") String instanceId) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.instanceId = instanceId;
    }

    /**
     * Stores session metadata in Redis as a hash with TTL 3600s.
     *
     * @param metadata the session metadata to store
     */
    public void storeSession(WebSocketSessionMetadata metadata) {
        String key = KEY_PREFIX + metadata.sessionId();
        Map<String, String> fields = new HashMap<>();
        fields.put(FIELD_USER_ID, metadata.userId());
        fields.put(FIELD_CONNECTED_AT, metadata.connectedAt().toString());
        fields.put(FIELD_SUBSCRIPTIONS, serializeSubscriptions(metadata.subscriptions()));
        fields.put(FIELD_INSTANCE_ID, metadata.instanceId());

        redisTemplate.opsForHash().putAll(key, fields);
        redisTemplate.expire(key, SESSION_TTL);
        localSessionIds.add(metadata.sessionId());

        log.info("Stored session metadata in Redis: sessionId={}, userId={}, instanceId={}",
                metadata.sessionId(), metadata.userId(), metadata.instanceId());
    }

    /**
     * Removes session metadata from Redis. Designed to complete within 5 seconds of disconnect.
     *
     * @param sessionId the session identifier to remove
     */
    public void removeSession(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        Boolean deleted = redisTemplate.delete(key);
        localSessionIds.remove(sessionId);

        if (Boolean.TRUE.equals(deleted)) {
            log.info("Removed session metadata from Redis: sessionId={}", sessionId);
        } else {
            log.debug("Session metadata not found in Redis for removal: sessionId={}", sessionId);
        }
    }

    /**
     * Refreshes the TTL for a session in Redis. Called periodically (every 300s) to keep
     * active sessions alive.
     *
     * @param sessionId the session identifier to refresh
     */
    public void refreshTtl(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        Boolean exists = redisTemplate.expire(key, SESSION_TTL);
        if (Boolean.TRUE.equals(exists)) {
            log.debug("Refreshed TTL for session: sessionId={}", sessionId);
        } else {
            // Session no longer exists in Redis — remove from local tracking
            localSessionIds.remove(sessionId);
            log.debug("Session no longer exists in Redis during TTL refresh: sessionId={}", sessionId);
        }
    }

    /**
     * Retrieves session metadata from Redis.
     *
     * @param sessionId the session identifier to look up
     * @return Optional containing the metadata if found, empty otherwise
     */
    public Optional<WebSocketSessionMetadata> getSession(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
        if (entries.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(deserializeMetadata(sessionId, entries));
    }

    /**
     * Returns all sessions for a given instance. Used for crash recovery and diagnostics.
     *
     * @param targetInstanceId the instance identifier to query
     * @return list of session metadata for the given instance
     */
    public List<WebSocketSessionMetadata> getSessionsByInstance(String targetInstanceId) {
        List<WebSocketSessionMetadata> sessions = new ArrayList<>();
        // Scan for all session keys and filter by instanceId
        Set<String> keys = redisTemplate.keys(KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return sessions;
        }

        for (String key : keys) {
            Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
            if (entries.isEmpty()) {
                continue;
            }
            String storedInstanceId = (String) entries.get(FIELD_INSTANCE_ID);
            if (targetInstanceId.equals(storedInstanceId)) {
                String sessionId = key.substring(KEY_PREFIX.length());
                sessions.add(deserializeMetadata(sessionId, entries));
            }
        }
        return sessions;
    }

    /**
     * Cleans up stale session entries for the current instance on startup.
     * This handles crash recovery where sessions were not properly removed before shutdown.
     * Triggered by ApplicationReadyEvent to run within 60 seconds of startup.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void cleanupStaleSessionsForInstance() {
        cleanupStaleSessionsForInstance(instanceId);
    }

    /**
     * Cleans up stale session entries for a specific instance.
     * Removes all session metadata in Redis that belongs to the given instanceId.
     *
     * @param targetInstanceId the instance identifier whose stale sessions should be cleaned
     */
    public void cleanupStaleSessionsForInstance(String targetInstanceId) {
        log.info("Starting stale session cleanup for instance: {}", targetInstanceId);
        List<WebSocketSessionMetadata> staleSessions = getSessionsByInstance(targetInstanceId);

        int cleanedCount = 0;
        for (WebSocketSessionMetadata session : staleSessions) {
            String key = KEY_PREFIX + session.sessionId();
            redisTemplate.delete(key);
            cleanedCount++;
        }

        log.info("Stale session cleanup complete for instance {}: removed {} sessions",
                targetInstanceId, cleanedCount);
    }

    /**
     * Scheduled task that refreshes TTL for all locally tracked sessions every 300 seconds.
     * Ensures active sessions do not expire while the connection is still alive.
     */
    @Scheduled(fixedRate = 300_000) // 300 seconds = 5 minutes
    public void refreshAllSessionTtls() {
        if (localSessionIds.isEmpty()) {
            return;
        }
        log.debug("Refreshing TTL for {} local sessions", localSessionIds.size());
        for (String sessionId : localSessionIds) {
            try {
                refreshTtl(sessionId);
            } catch (Exception ex) {
                log.warn("Failed to refresh TTL for session {}: {}", sessionId, ex.getMessage());
            }
        }
    }

    /**
     * Finds all sessions belonging to a specific user across all instances.
     * Scans Redis keys with the ws:session: prefix and filters by userId.
     *
     * @param userId the user identifier to search for
     * @return list of session metadata for the given user
     */
    public List<WebSocketSessionMetadata> getSessionsByUser(String userId) {
        List<WebSocketSessionMetadata> sessions = new ArrayList<>();
        Set<String> keys = redisTemplate.keys(KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return sessions;
        }

        for (String key : keys) {
            Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
            if (entries.isEmpty()) {
                continue;
            }
            String storedUserId = (String) entries.get(FIELD_USER_ID);
            if (userId.equals(storedUserId)) {
                String sessionId = key.substring(KEY_PREFIX.length());
                sessions.add(deserializeMetadata(sessionId, entries));
            }
        }
        return sessions;
    }

    /**
     * Returns the instance ID for this notification-service instance.
     */
    public String getInstanceId() {
        return instanceId;
    }

    /**
     * Returns the set of locally tracked session IDs (sessions on this instance).
     * Useful for diagnostics.
     */
    public Set<String> getLocalSessionIds() {
        return Set.copyOf(localSessionIds);
    }

    private String serializeSubscriptions(List<String> subscriptions) {
        try {
            return objectMapper.writeValueAsString(subscriptions);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize subscriptions, using empty array: {}", ex.getMessage());
            return "[]";
        }
    }

    private List<String> deserializeSubscriptions(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException ex) {
            log.warn("Failed to deserialize subscriptions, returning empty list: {}", ex.getMessage());
            return List.of();
        }
    }

    private WebSocketSessionMetadata deserializeMetadata(String sessionId, Map<Object, Object> entries) {
        String userId = (String) entries.get(FIELD_USER_ID);
        String connectedAtStr = (String) entries.get(FIELD_CONNECTED_AT);
        String subscriptionsJson = (String) entries.get(FIELD_SUBSCRIPTIONS);
        String storedInstanceId = (String) entries.get(FIELD_INSTANCE_ID);

        Instant connectedAt = connectedAtStr != null ? Instant.parse(connectedAtStr) : Instant.now();
        List<String> subscriptions = deserializeSubscriptions(subscriptionsJson);

        return new WebSocketSessionMetadata(sessionId, userId, connectedAt, subscriptions, storedInstanceId);
    }
}
