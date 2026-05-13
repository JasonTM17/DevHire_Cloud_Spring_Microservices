package com.devhire.notification.integration;

import com.devhire.notification.websocket.WebSocketSessionCache;
import com.devhire.notification.websocket.WebSocketSessionMetadata;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * Integration tests for WebSocket session lifecycle using Testcontainers with Redis.
 * Tests session metadata stored/removed in Redis on connect/disconnect,
 * TTL refresh behavior, and stale session cleanup on instance restart.
 *
 * <p>Validates: Requirements 11.1, 11.2, 11.3, 11.5</p>
 */
@Tag("integration")
@Testcontainers(disabledWithoutDocker = true)
class SessionLifecycleIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7.4-alpine"))
            .withExposedPorts(6379);

    private StringRedisTemplate redisTemplate;
    private WebSocketSessionCache sessionCache;
    private ObjectMapper objectMapper;

    private static final String INSTANCE_ID = "test-instance-1";

    @BeforeEach
    void setUp() {
        LettuceConnectionFactory connectionFactory = new LettuceConnectionFactory(
                REDIS.getHost(), REDIS.getMappedPort(6379));
        connectionFactory.afterPropertiesSet();

        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();

        objectMapper = new ObjectMapper();
        sessionCache = new WebSocketSessionCache(redisTemplate, objectMapper, INSTANCE_ID);

        // Clean up Redis before each test
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushAll();
    }

    /**
     * Requirement 11.1: WHEN a WebSocket session is established, THE WebSocket_Gateway SHALL
     * store session metadata (userId, connectedAt, subscriptions, instanceId) in Redis with a TTL of 3600 seconds.
     */
    @Test
    void storeSession_persistsMetadataInRedisWithCorrectTtl() {
        Instant connectedAt = Instant.parse("2024-06-15T10:30:00Z");
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-abc", "user-123", connectedAt,
                List.of("/user/user-123/notifications", "/topic/presence"), INSTANCE_ID);

        sessionCache.storeSession(metadata);

        // Verify the key exists in Redis
        String key = "ws:session:session-abc";
        assertThat(redisTemplate.hasKey(key)).isTrue();

        // Verify all fields are stored correctly
        assertThat(redisTemplate.opsForHash().get(key, "userId")).isEqualTo("user-123");
        assertThat(redisTemplate.opsForHash().get(key, "connectedAt")).isEqualTo("2024-06-15T10:30:00Z");
        assertThat(redisTemplate.opsForHash().get(key, "instanceId")).isEqualTo(INSTANCE_ID);
        String subscriptions = (String) redisTemplate.opsForHash().get(key, "subscriptions");
        assertThat(subscriptions).contains("/user/user-123/notifications");
        assertThat(subscriptions).contains("/topic/presence");

        // Verify TTL is set (should be close to 3600 seconds)
        Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        assertThat(ttl).isNotNull().isGreaterThan(3500L).isLessThanOrEqualTo(3600L);
    }

    /**
     * Requirement 11.1: Verify session can be retrieved after storage.
     */
    @Test
    void storeSession_canBeRetrievedViaGetSession() {
        Instant connectedAt = Instant.now();
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-xyz", "user-456", connectedAt,
                List.of("/topic/leaderboard"), INSTANCE_ID);

        sessionCache.storeSession(metadata);

        Optional<WebSocketSessionMetadata> retrieved = sessionCache.getSession("session-xyz");
        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().userId()).isEqualTo("user-456");
        assertThat(retrieved.get().subscriptions()).containsExactly("/topic/leaderboard");
        assertThat(retrieved.get().instanceId()).isEqualTo(INSTANCE_ID);
    }

    /**
     * Requirement 11.2: WHEN a WebSocket session is terminated, THE WebSocket_Gateway SHALL
     * remove the session metadata from Redis within 5 seconds.
     */
    @Test
    void removeSession_deletesMetadataFromRedis() {
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-del", "user-789", Instant.now(), List.of(), INSTANCE_ID);
        sessionCache.storeSession(metadata);

        // Verify it exists first
        assertThat(redisTemplate.hasKey("ws:session:session-del")).isTrue();

        // Remove the session
        sessionCache.removeSession("session-del");

        // Verify it's gone
        assertThat(redisTemplate.hasKey("ws:session:session-del")).isFalse();
        assertThat(sessionCache.getSession("session-del")).isEmpty();
    }

    /**
     * Requirement 11.2: Removing a non-existent session should not throw.
     */
    @Test
    void removeSession_handlesNonExistentSessionGracefully() {
        sessionCache.removeSession("non-existent-session");
        // Should not throw
        assertThat(sessionCache.getSession("non-existent-session")).isEmpty();
    }

    /**
     * Requirement 11.3: WHILE a WebSocket session is active, THE WebSocket_Gateway SHALL
     * refresh the session TTL in Redis every 300 seconds.
     */
    @Test
    void refreshTtl_resetsSessionExpirationToFull3600Seconds() {
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-ttl", "user-ttl", Instant.now(), List.of(), INSTANCE_ID);
        sessionCache.storeSession(metadata);

        // Simulate time passing by manually reducing TTL
        String key = "ws:session:session-ttl";
        redisTemplate.expire(key, Duration.ofSeconds(100));

        // Verify TTL was reduced
        Long reducedTtl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        assertThat(reducedTtl).isLessThanOrEqualTo(100L);

        // Refresh TTL
        sessionCache.refreshTtl("session-ttl");

        // Verify TTL is back to ~3600 seconds
        Long refreshedTtl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        assertThat(refreshedTtl).isGreaterThan(3500L).isLessThanOrEqualTo(3600L);
    }

    /**
     * Requirement 11.3: TTL refresh on expired session removes from local tracking.
     */
    @Test
    void refreshTtl_removesFromLocalTrackingWhenSessionExpired() {
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-expired", "user-exp", Instant.now(), List.of(), INSTANCE_ID);
        sessionCache.storeSession(metadata);
        assertThat(sessionCache.getLocalSessionIds()).contains("session-expired");

        // Delete the key to simulate expiration
        redisTemplate.delete("ws:session:session-expired");

        // Refresh should detect the key is gone
        sessionCache.refreshTtl("session-expired");

        assertThat(sessionCache.getLocalSessionIds()).doesNotContain("session-expired");
    }

    /**
     * Requirement 11.5: IF a WebSocket_Gateway instance restarts, THEN THE WebSocket_Gateway
     * SHALL clean up stale session entries for its instanceId within 60 seconds of startup.
     */
    @Test
    void cleanupStaleSessionsForInstance_removesAllSessionsForTargetInstance() {
        // Store sessions for our instance
        sessionCache.storeSession(new WebSocketSessionMetadata(
                "stale-1", "user-a", Instant.now(), List.of(), INSTANCE_ID));
        sessionCache.storeSession(new WebSocketSessionMetadata(
                "stale-2", "user-b", Instant.now(), List.of(), INSTANCE_ID));

        // Store a session for a different instance
        WebSocketSessionCache otherCache = new WebSocketSessionCache(
                redisTemplate, objectMapper, "other-instance");
        otherCache.storeSession(new WebSocketSessionMetadata(
                "other-1", "user-c", Instant.now(), List.of(), "other-instance"));

        // Verify all sessions exist
        assertThat(redisTemplate.hasKey("ws:session:stale-1")).isTrue();
        assertThat(redisTemplate.hasKey("ws:session:stale-2")).isTrue();
        assertThat(redisTemplate.hasKey("ws:session:other-1")).isTrue();

        // Simulate instance restart: cleanup stale sessions for our instance
        sessionCache.cleanupStaleSessionsForInstance(INSTANCE_ID);

        // Our instance's sessions should be removed
        assertThat(redisTemplate.hasKey("ws:session:stale-1")).isFalse();
        assertThat(redisTemplate.hasKey("ws:session:stale-2")).isFalse();

        // Other instance's session should remain
        assertThat(redisTemplate.hasKey("ws:session:other-1")).isTrue();
    }

    /**
     * Requirement 11.5: Cleanup with no stale sessions does nothing.
     */
    @Test
    void cleanupStaleSessionsForInstance_doesNothingWhenNoSessionsExist() {
        sessionCache.cleanupStaleSessionsForInstance(INSTANCE_ID);
        // Should not throw, no sessions to clean
    }

    /**
     * Requirement 11.5: Multiple instances can coexist without interfering.
     */
    @Test
    void multipleInstances_sessionsAreIsolatedByInstanceId() {
        WebSocketSessionCache instance1Cache = new WebSocketSessionCache(
                redisTemplate, objectMapper, "instance-1");
        WebSocketSessionCache instance2Cache = new WebSocketSessionCache(
                redisTemplate, objectMapper, "instance-2");

        instance1Cache.storeSession(new WebSocketSessionMetadata(
                "s1", "user-1", Instant.now(), List.of("/topic/a"), "instance-1"));
        instance1Cache.storeSession(new WebSocketSessionMetadata(
                "s2", "user-2", Instant.now(), List.of("/topic/b"), "instance-1"));
        instance2Cache.storeSession(new WebSocketSessionMetadata(
                "s3", "user-3", Instant.now(), List.of("/topic/c"), "instance-2"));

        // Query by instance
        List<WebSocketSessionMetadata> inst1Sessions = sessionCache.getSessionsByInstance("instance-1");
        List<WebSocketSessionMetadata> inst2Sessions = sessionCache.getSessionsByInstance("instance-2");

        assertThat(inst1Sessions).hasSize(2);
        assertThat(inst2Sessions).hasSize(1);
        assertThat(inst2Sessions.get(0).userId()).isEqualTo("user-3");
    }

    /**
     * Requirement 11.1: Session with empty subscriptions is stored correctly.
     */
    @Test
    void storeSession_handlesEmptySubscriptions() {
        WebSocketSessionMetadata metadata = new WebSocketSessionMetadata(
                "session-empty", "user-empty", Instant.now(), List.of(), INSTANCE_ID);

        sessionCache.storeSession(metadata);

        Optional<WebSocketSessionMetadata> retrieved = sessionCache.getSession("session-empty");
        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().subscriptions()).isEmpty();
    }

    /**
     * Requirement 11.3: Verify refreshAllSessionTtls refreshes all locally tracked sessions.
     */
    @Test
    void refreshAllSessionTtls_refreshesAllLocalSessions() {
        sessionCache.storeSession(new WebSocketSessionMetadata(
                "s-refresh-1", "user-r1", Instant.now(), List.of(), INSTANCE_ID));
        sessionCache.storeSession(new WebSocketSessionMetadata(
                "s-refresh-2", "user-r2", Instant.now(), List.of(), INSTANCE_ID));

        // Reduce TTLs
        redisTemplate.expire("ws:session:s-refresh-1", Duration.ofSeconds(50));
        redisTemplate.expire("ws:session:s-refresh-2", Duration.ofSeconds(50));

        // Refresh all
        sessionCache.refreshAllSessionTtls();

        // Both should have full TTL again
        Long ttl1 = redisTemplate.getExpire("ws:session:s-refresh-1", TimeUnit.SECONDS);
        Long ttl2 = redisTemplate.getExpire("ws:session:s-refresh-2", TimeUnit.SECONDS);
        assertThat(ttl1).isGreaterThan(3500L);
        assertThat(ttl2).isGreaterThan(3500L);
    }
}
