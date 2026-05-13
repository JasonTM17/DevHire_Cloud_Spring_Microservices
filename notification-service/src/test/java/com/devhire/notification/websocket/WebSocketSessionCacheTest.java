package com.devhire.notification.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class WebSocketSessionCacheTest {

    private StringRedisTemplate redisTemplate;
    private HashOperations<String, Object, Object> hashOperations;
    private ObjectMapper objectMapper;
    private WebSocketSessionCache cache;

    private static final String INSTANCE_ID = "test-instance-1";

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        hashOperations = mock(HashOperations.class);
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        objectMapper = new ObjectMapper();
        cache = new WebSocketSessionCache(redisTemplate, objectMapper, INSTANCE_ID);
    }

    @Test
    void storeSession_savesMetadataAsRedisHashWithTtl() {
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-1", "user-42", Instant.parse("2024-01-15T10:30:00Z"),
                List.of("/user/user-42/notifications", "/topic/presence"), INSTANCE_ID);

        cache.storeSession(metadata);

        String expectedKey = "ws:session:session-1";
        verify(hashOperations).putAll(eq(expectedKey), argThat(map -> {
            @SuppressWarnings("unchecked")
            Map<String, String> fields = (Map<String, String>) (Map<?, ?>) map;
            return "user-42".equals(fields.get("userId"))
                    && "2024-01-15T10:30:00Z".equals(fields.get("connectedAt"))
                    && fields.get("subscriptions").contains("/user/user-42/notifications")
                    && INSTANCE_ID.equals(fields.get("instanceId"));
        }));
        verify(redisTemplate).expire(expectedKey, Duration.ofSeconds(3600));
    }

    @Test
    void storeSession_tracksSessionLocally() {
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-1", "user-42", Instant.now(), List.of(), INSTANCE_ID);

        cache.storeSession(metadata);

        assertThat(cache.getLocalSessionIds()).contains("session-1");
    }

    @Test
    void removeSession_deletesKeyFromRedis() {
        when(redisTemplate.delete("ws:session:session-1")).thenReturn(true);

        cache.removeSession("session-1");

        verify(redisTemplate).delete("ws:session:session-1");
    }

    @Test
    void removeSession_removesFromLocalTracking() {
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-1", "user-42", Instant.now(), List.of(), INSTANCE_ID);
        cache.storeSession(metadata);

        when(redisTemplate.delete("ws:session:session-1")).thenReturn(true);
        cache.removeSession("session-1");

        assertThat(cache.getLocalSessionIds()).doesNotContain("session-1");
    }

    @Test
    void removeSession_handlesNonExistentSessionGracefully() {
        when(redisTemplate.delete("ws:session:unknown")).thenReturn(false);

        cache.removeSession("unknown");

        verify(redisTemplate).delete("ws:session:unknown");
    }

    @Test
    void refreshTtl_refreshesExpirationForExistingSession() {
        when(redisTemplate.expire("ws:session:session-1", Duration.ofSeconds(3600))).thenReturn(true);

        cache.refreshTtl("session-1");

        verify(redisTemplate).expire("ws:session:session-1", Duration.ofSeconds(3600));
    }

    @Test
    void refreshTtl_removesFromLocalTrackingIfSessionExpired() {
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-1", "user-42", Instant.now(), List.of(), INSTANCE_ID);
        cache.storeSession(metadata);

        when(redisTemplate.expire("ws:session:session-1", Duration.ofSeconds(3600))).thenReturn(false);
        cache.refreshTtl("session-1");

        assertThat(cache.getLocalSessionIds()).doesNotContain("session-1");
    }

    @Test
    void getSession_returnsMetadataWhenExists() {
        Map<Object, Object> entries = new HashMap<>();
        entries.put("userId", "user-42");
        entries.put("connectedAt", "2024-01-15T10:30:00Z");
        entries.put("subscriptions", "[\"/user/user-42/notifications\"]");
        entries.put("instanceId", INSTANCE_ID);

        when(hashOperations.entries("ws:session:session-1")).thenReturn(entries);

        Optional<WebSocketSessionMetadata> result = cache.getSession("session-1");

        assertThat(result).isPresent();
        WebSocketSessionMetadata metadata = result.get();
        assertThat(metadata.sessionId()).isEqualTo("session-1");
        assertThat(metadata.userId()).isEqualTo("user-42");
        assertThat(metadata.connectedAt()).isEqualTo(Instant.parse("2024-01-15T10:30:00Z"));
        assertThat(metadata.subscriptions()).containsExactly("/user/user-42/notifications");
        assertThat(metadata.instanceId()).isEqualTo(INSTANCE_ID);
    }

    @Test
    void getSession_returnsEmptyWhenNotFound() {
        when(hashOperations.entries("ws:session:unknown")).thenReturn(Map.of());

        Optional<WebSocketSessionMetadata> result = cache.getSession("unknown");

        assertThat(result).isEmpty();
    }

    @Test
    void getSessionsByInstance_returnsOnlyMatchingInstances() {
        Set<String> keys = Set.of("ws:session:s1", "ws:session:s2", "ws:session:s3");
        when(redisTemplate.keys("ws:session:*")).thenReturn(keys);

        Map<Object, Object> s1Entries = Map.of(
                "userId", "user-1", "connectedAt", "2024-01-15T10:00:00Z",
                "subscriptions", "[]", "instanceId", INSTANCE_ID);
        Map<Object, Object> s2Entries = Map.of(
                "userId", "user-2", "connectedAt", "2024-01-15T11:00:00Z",
                "subscriptions", "[]", "instanceId", "other-instance");
        Map<Object, Object> s3Entries = Map.of(
                "userId", "user-3", "connectedAt", "2024-01-15T12:00:00Z",
                "subscriptions", "[]", "instanceId", INSTANCE_ID);

        when(hashOperations.entries("ws:session:s1")).thenReturn(s1Entries);
        when(hashOperations.entries("ws:session:s2")).thenReturn(s2Entries);
        when(hashOperations.entries("ws:session:s3")).thenReturn(s3Entries);

        List<WebSocketSessionMetadata> result = cache.getSessionsByInstance(INSTANCE_ID);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(m -> INSTANCE_ID.equals(m.instanceId()));
    }

    @Test
    void cleanupStaleSessionsForInstance_removesAllSessionsForInstance() {
        Set<String> keys = Set.of("ws:session:s1", "ws:session:s2");
        when(redisTemplate.keys("ws:session:*")).thenReturn(keys);

        Map<Object, Object> s1Entries = Map.of(
                "userId", "user-1", "connectedAt", "2024-01-15T10:00:00Z",
                "subscriptions", "[]", "instanceId", INSTANCE_ID);
        Map<Object, Object> s2Entries = Map.of(
                "userId", "user-2", "connectedAt", "2024-01-15T11:00:00Z",
                "subscriptions", "[]", "instanceId", INSTANCE_ID);

        when(hashOperations.entries("ws:session:s1")).thenReturn(s1Entries);
        when(hashOperations.entries("ws:session:s2")).thenReturn(s2Entries);

        cache.cleanupStaleSessionsForInstance(INSTANCE_ID);

        verify(redisTemplate).delete("ws:session:s1");
        verify(redisTemplate).delete("ws:session:s2");
    }

    @Test
    void cleanupStaleSessionsForInstance_doesNothingWhenNoSessionsExist() {
        when(redisTemplate.keys("ws:session:*")).thenReturn(Set.of());

        cache.cleanupStaleSessionsForInstance(INSTANCE_ID);

        verify(redisTemplate, never()).delete(anyString());
    }

    @Test
    void refreshAllSessionTtls_refreshesAllLocalSessions() {
        WebSocketSessionMetadata m1 = new WebSocketSessionMetadata(
                "s1", "user-1", Instant.now(), List.of(), INSTANCE_ID);
        WebSocketSessionMetadata m2 = new WebSocketSessionMetadata(
                "s2", "user-2", Instant.now(), List.of(), INSTANCE_ID);
        cache.storeSession(m1);
        cache.storeSession(m2);

        // Reset interactions so we only verify the refresh calls
        clearInvocations(redisTemplate);

        when(redisTemplate.expire("ws:session:s1", Duration.ofSeconds(3600))).thenReturn(true);
        when(redisTemplate.expire("ws:session:s2", Duration.ofSeconds(3600))).thenReturn(true);

        cache.refreshAllSessionTtls();

        verify(redisTemplate).expire("ws:session:s1", Duration.ofSeconds(3600));
        verify(redisTemplate).expire("ws:session:s2", Duration.ofSeconds(3600));
    }

    @Test
    void refreshAllSessionTtls_skipsWhenNoLocalSessions() {
        cache.refreshAllSessionTtls();

        verify(redisTemplate, never()).expire(anyString(), any(Duration.class));
    }

    @Test
    void getInstanceId_returnsConfiguredInstanceId() {
        assertThat(cache.getInstanceId()).isEqualTo(INSTANCE_ID);
    }
}
