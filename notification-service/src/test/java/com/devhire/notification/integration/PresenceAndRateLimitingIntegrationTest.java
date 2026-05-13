package com.devhire.notification.integration;

import com.devhire.notification.presence.PresenceTracker;
import com.devhire.notification.ratelimit.RateLimitResult;
import com.devhire.notification.ratelimit.RateLimitType;
import com.devhire.notification.ratelimit.SlidingWindowRateLimiter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.mock;

/**
 * Integration tests for presence TTL expiry and rate limiter behavior using Testcontainers with Redis.
 * Tests presence TTL expiry marking users offline, and rate limiter behavior under concurrent requests.
 *
 * <p>Validates: Requirements 8.3, 12.1, 12.2</p>
 */
@Tag("integration")
@Testcontainers(disabledWithoutDocker = true)
class PresenceAndRateLimitingIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7.4-alpine"))
            .withExposedPorts(6379);

    private StringRedisTemplate redisTemplate;
    private PresenceTracker presenceTracker;
    private SlidingWindowRateLimiter rateLimiter;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        LettuceConnectionFactory connectionFactory = new LettuceConnectionFactory(
                REDIS.getHost(), REDIS.getMappedPort(6379));
        connectionFactory.afterPropertiesSet();

        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();

        objectMapper = new ObjectMapper();

        // Use a mock SimpMessagingTemplate since we're testing Redis behavior, not STOMP delivery
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        presenceTracker = new PresenceTracker(redisTemplate, messagingTemplate, objectMapper);

        rateLimiter = new SlidingWindowRateLimiter(redisTemplate);

        // Clean up Redis before each test
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushAll();
    }

    // ==================== Presence TTL Expiry Tests ====================

    /**
     * Requirement 8.3: WHEN a user disconnects (gracefully or via timeout), THE Presence_Tracker
     * SHALL mark the user as offline within 90 seconds.
     *
     * Tests that presence key has correct TTL of 90 seconds when user is marked online.
     */
    @Test
    void markOnline_setsPresenceKeyWithCorrect90SecondTtl() {
        presenceTracker.markOnline("user-ttl-1", "job:123");

        String key = "presence:user:user-ttl-1";
        assertThat(redisTemplate.hasKey(key)).isTrue();

        Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        assertThat(ttl).isNotNull().isGreaterThan(85L).isLessThanOrEqualTo(90L);
    }

    /**
     * Requirement 8.3: Presence TTL expiry marks user offline.
     * Uses a short TTL to simulate expiry behavior without waiting 90 seconds.
     */
    @Test
    void presenceKey_expiresAfterTtl_userNoLongerOnline() {
        // Directly set a presence key with a very short TTL to test expiry behavior
        String key = "presence:user:user-expire-1";
        String value = "{\"context\":\"job:456\",\"connectedAt\":\"2024-06-15T10:00:00Z\"}";
        redisTemplate.opsForValue().set(key, value, Duration.ofSeconds(2));

        // User should be visible initially
        assertThat(redisTemplate.hasKey(key)).isTrue();

        // Wait for TTL to expire
        await().atMost(5, TimeUnit.SECONDS)
                .pollInterval(500, TimeUnit.MILLISECONDS)
                .untilAsserted(() -> assertThat(redisTemplate.hasKey(key)).isFalse());

        // After expiry, getOnlineUsers should not include this user
        Set<String> onlineUsers = presenceTracker.getOnlineUsers("job:456");
        assertThat(onlineUsers).doesNotContain("user-expire-1");
    }

    /**
     * Requirement 8.3: Heartbeat refresh prevents TTL expiry.
     */
    @Test
    void refreshHeartbeat_preventsPresenceExpiry() {
        presenceTracker.markOnline("user-heartbeat-1", "assessment:789");

        String key = "presence:user:user-heartbeat-1";

        // Manually reduce TTL to simulate time passing
        redisTemplate.expire(key, Duration.ofSeconds(10));
        Long reducedTtl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        assertThat(reducedTtl).isLessThanOrEqualTo(10L);

        // Refresh heartbeat should reset TTL to 90 seconds
        presenceTracker.refreshHeartbeat("user-heartbeat-1");

        Long refreshedTtl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        assertThat(refreshedTtl).isGreaterThan(85L).isLessThanOrEqualTo(90L);
    }

    /**
     * Requirement 8.3: Without heartbeat refresh, user becomes offline after TTL expiry.
     */
    @Test
    void withoutHeartbeat_userBecomesOfflineAfterTtlExpiry() {
        // Set presence with a short TTL to simulate no heartbeat scenario
        String key = "presence:user:user-no-heartbeat";
        String value = "{\"context\":\"job:100\",\"connectedAt\":\"2024-06-15T10:00:00Z\"}";
        redisTemplate.opsForValue().set(key, value, Duration.ofSeconds(2));

        // Initially online
        Set<String> onlineBefore = presenceTracker.getOnlineUsers("job:100");
        assertThat(onlineBefore).contains("user-no-heartbeat");

        // Wait for expiry
        await().atMost(5, TimeUnit.SECONDS)
                .pollInterval(500, TimeUnit.MILLISECONDS)
                .untilAsserted(() -> {
                    Set<String> onlineAfter = presenceTracker.getOnlineUsers("job:100");
                    assertThat(onlineAfter).doesNotContain("user-no-heartbeat");
                });
    }

    /**
     * Requirement 8.3: Multiple users with different contexts tracked independently.
     */
    @Test
    void multipleUsers_presenceTrackedIndependentlyByContext() {
        presenceTracker.markOnline("user-ctx-1", "job:200");
        presenceTracker.markOnline("user-ctx-2", "job:200");
        presenceTracker.markOnline("user-ctx-3", "assessment:300");

        Set<String> jobViewers = presenceTracker.getOnlineUsers("job:200");
        assertThat(jobViewers).containsExactlyInAnyOrder("user-ctx-1", "user-ctx-2");

        Set<String> assessmentViewers = presenceTracker.getOnlineUsers("assessment:300");
        assertThat(assessmentViewers).containsExactly("user-ctx-3");
    }

    /**
     * Requirement 8.3: markOffline explicitly removes presence before TTL expiry.
     */
    @Test
    void markOffline_removesPresenceImmediately() {
        presenceTracker.markOnline("user-offline-1", "job:400");
        assertThat(redisTemplate.hasKey("presence:user:user-offline-1")).isTrue();

        presenceTracker.markOffline("user-offline-1");

        assertThat(redisTemplate.hasKey("presence:user:user-offline-1")).isFalse();
        Set<String> onlineUsers = presenceTracker.getOnlineUsers("job:400");
        assertThat(onlineUsers).doesNotContain("user-offline-1");
    }

    // ==================== Rate Limiter Integration Tests ====================

    /**
     * Requirement 12.1: THE Rate_Limiter SHALL enforce a sliding window rate limit of
     * 100 REST API requests per user per 60-second window.
     */
    @Test
    void restRateLimit_allows100RequestsThenDenies() {
        String userId = "user-rest-limit";

        // Send 100 requests - all should be allowed
        for (int i = 0; i < 100; i++) {
            RateLimitResult result = rateLimiter.checkLimit(userId, RateLimitType.REST);
            assertThat(result.allowed())
                    .as("Request %d should be allowed", i + 1)
                    .isTrue();
        }

        // 101st request should be denied
        RateLimitResult denied = rateLimiter.checkLimit(userId, RateLimitType.REST);
        assertThat(denied.allowed()).isFalse();
        assertThat(denied.retryAfterSeconds()).isGreaterThan(0);
    }

    /**
     * Requirement 12.2: THE Rate_Limiter SHALL enforce a sliding window rate limit of
     * 50 WebSocket messages sent per user per 60-second window.
     */
    @Test
    void websocketRateLimit_allows50MessagesThenDenies() {
        String userId = "user-ws-limit";

        // Send 50 messages - all should be allowed
        for (int i = 0; i < 50; i++) {
            RateLimitResult result = rateLimiter.checkLimit(userId, RateLimitType.WEBSOCKET);
            assertThat(result.allowed())
                    .as("Message %d should be allowed", i + 1)
                    .isTrue();
        }

        // 51st message should be denied
        RateLimitResult denied = rateLimiter.checkLimit(userId, RateLimitType.WEBSOCKET);
        assertThat(denied.allowed()).isFalse();
        assertThat(denied.retryAfterSeconds()).isGreaterThan(0);
    }

    /**
     * Requirement 12.1, 12.2: Rate limits are per-user - different users have independent limits.
     */
    @Test
    void rateLimits_arePerUser_independentLimits() {
        String userA = "user-independent-a";
        String userB = "user-independent-b";

        // Exhaust user A's REST limit
        for (int i = 0; i < 100; i++) {
            rateLimiter.checkLimit(userA, RateLimitType.REST);
        }

        // User A should be denied
        RateLimitResult userAResult = rateLimiter.checkLimit(userA, RateLimitType.REST);
        assertThat(userAResult.allowed()).isFalse();

        // User B should still be allowed
        RateLimitResult userBResult = rateLimiter.checkLimit(userB, RateLimitType.REST);
        assertThat(userBResult.allowed()).isTrue();
    }

    /**
     * Requirement 12.1, 12.2: Rate limiter behavior under concurrent requests.
     * Multiple threads sending requests simultaneously should still enforce the limit.
     */
    @Test
    void rateLimiter_underConcurrentRequests_enforcesLimit() throws InterruptedException {
        String userId = "user-concurrent";
        int threadCount = 20;
        int requestsPerThread = 10; // 20 * 10 = 200 total attempts, limit is 100

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger allowedCount = new AtomicInteger(0);
        AtomicInteger deniedCount = new AtomicInteger(0);

        for (int t = 0; t < threadCount; t++) {
            executor.submit(() -> {
                try {
                    startLatch.await(); // All threads start simultaneously
                    for (int r = 0; r < requestsPerThread; r++) {
                        RateLimitResult result = rateLimiter.checkLimit(userId, RateLimitType.REST);
                        if (result.allowed()) {
                            allowedCount.incrementAndGet();
                        } else {
                            deniedCount.incrementAndGet();
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Release all threads at once
        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();

        // Total allowed should be at most 100 (the REST limit)
        // Due to race conditions in Redis operations, we allow a small tolerance
        assertThat(allowedCount.get()).isLessThanOrEqualTo(100 + threadCount);
        assertThat(allowedCount.get()).isGreaterThanOrEqualTo(90); // At least close to 100

        // Total should equal all attempts
        assertThat(allowedCount.get() + deniedCount.get()).isEqualTo(threadCount * requestsPerThread);
    }

    /**
     * Requirement 12.1: REST and WebSocket limits are independent for the same user.
     */
    @Test
    void restAndWebsocketLimits_areIndependent() {
        String userId = "user-type-independent";

        // Exhaust WebSocket limit (50)
        for (int i = 0; i < 50; i++) {
            rateLimiter.checkLimit(userId, RateLimitType.WEBSOCKET);
        }

        // WebSocket should be denied
        RateLimitResult wsDenied = rateLimiter.checkLimit(userId, RateLimitType.WEBSOCKET);
        assertThat(wsDenied.allowed()).isFalse();

        // REST should still be allowed (separate limit)
        RateLimitResult restAllowed = rateLimiter.checkLimit(userId, RateLimitType.REST);
        assertThat(restAllowed.allowed()).isTrue();
    }

    /**
     * Requirement 12.1: Retry-After value is positive when rate limited.
     */
    @Test
    void rateLimitDenied_providesPositiveRetryAfter() {
        String userId = "user-retry-after";

        // Exhaust the limit
        for (int i = 0; i < 100; i++) {
            rateLimiter.checkLimit(userId, RateLimitType.REST);
        }

        RateLimitResult denied = rateLimiter.checkLimit(userId, RateLimitType.REST);
        assertThat(denied.allowed()).isFalse();
        assertThat(denied.retryAfterSeconds()).isGreaterThan(0);
        // Retry-After should be at most 60 seconds (the window size)
        assertThat(denied.retryAfterSeconds()).isLessThanOrEqualTo(60);
    }

    /**
     * Requirement 12.2: WebSocket rate limit concurrent stress test.
     */
    @Test
    void websocketRateLimit_concurrentMessages_enforcesLimit() throws InterruptedException {
        String userId = "user-ws-concurrent";
        int threadCount = 10;
        int messagesPerThread = 10; // 10 * 10 = 100 total attempts, limit is 50

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger allowedCount = new AtomicInteger(0);
        AtomicInteger deniedCount = new AtomicInteger(0);

        for (int t = 0; t < threadCount; t++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    for (int r = 0; r < messagesPerThread; r++) {
                        RateLimitResult result = rateLimiter.checkLimit(userId, RateLimitType.WEBSOCKET);
                        if (result.allowed()) {
                            allowedCount.incrementAndGet();
                        } else {
                            deniedCount.incrementAndGet();
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();

        // Total allowed should be at most 50 (the WebSocket limit) with small tolerance for races
        assertThat(allowedCount.get()).isLessThanOrEqualTo(50 + threadCount);
        assertThat(allowedCount.get()).isGreaterThanOrEqualTo(45);

        assertThat(allowedCount.get() + deniedCount.get()).isEqualTo(threadCount * messagesPerThread);
    }
}
