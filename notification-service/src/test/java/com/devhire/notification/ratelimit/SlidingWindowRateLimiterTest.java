package com.devhire.notification.ratelimit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SlidingWindowRateLimiterTest {

    private StringRedisTemplate redisTemplate;
    private ZSetOperations<String, String> zSetOps;
    private Clock clock;
    private SlidingWindowRateLimiter rateLimiter;

    private static final String USER_ID = "user-123";
    private static final Instant BASE_TIME = Instant.parse("2024-01-01T12:00:00Z");

    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        zSetOps = mock(ZSetOperations.class);
        when(redisTemplate.opsForZSet()).thenReturn(zSetOps);

        clock = Clock.fixed(BASE_TIME, ZoneId.of("UTC"));
        rateLimiter = new SlidingWindowRateLimiter(redisTemplate, clock);
    }

    @Test
    void allowsRequestWhenUnderLimit() {
        String key = "ratelimit:rest:" + USER_ID;
        when(zSetOps.zCard(key)).thenReturn(50L);

        RateLimitResult result = rateLimiter.checkLimit(USER_ID, RateLimitType.REST);

        assertThat(result.allowed()).isTrue();
        assertThat(result.retryAfterSeconds()).isZero();
        assertThat(result.type()).isEqualTo(RateLimitType.REST);

        // Verify expired entries were removed
        verify(zSetOps).removeRangeByScore(eq(key), eq(Double.NEGATIVE_INFINITY),
                eq((double) (BASE_TIME.toEpochMilli() - 60_000L)));
        // Verify new entry was added
        verify(zSetOps).add(eq(key), anyString(), eq((double) BASE_TIME.toEpochMilli()));
        // Verify TTL was set
        verify(redisTemplate).expire(key, Duration.ofSeconds(120));
    }

    @Test
    void deniesRequestWhenAtRestLimit() {
        String key = "ratelimit:rest:" + USER_ID;
        when(zSetOps.zCard(key)).thenReturn(100L);

        // Oldest entry is 50 seconds ago
        long oldestTimestamp = BASE_TIME.toEpochMilli() - 50_000L;
        ZSetOperations.TypedTuple<String> oldestTuple = ZSetOperations.TypedTuple.of("oldest-id", (double) oldestTimestamp);
        Set<ZSetOperations.TypedTuple<String>> oldestSet = new LinkedHashSet<>();
        oldestSet.add(oldestTuple);
        when(zSetOps.rangeWithScores(key, 0, 0)).thenReturn(oldestSet);

        RateLimitResult result = rateLimiter.checkLimit(USER_ID, RateLimitType.REST);

        assertThat(result.allowed()).isFalse();
        assertThat(result.isDenied()).isTrue();
        // Oldest entry expires at oldestTimestamp + 60000 = BASE_TIME + 10000ms = 10 seconds from now
        assertThat(result.retryAfterSeconds()).isEqualTo(10);
        assertThat(result.type()).isEqualTo(RateLimitType.REST);

        // Verify no new entry was added
        verify(zSetOps, never()).add(eq(key), anyString(), anyDouble());
    }

    @Test
    void deniesRequestWhenAtWebSocketLimit() {
        String key = "ratelimit:websocket:" + USER_ID;
        when(zSetOps.zCard(key)).thenReturn(50L);

        long oldestTimestamp = BASE_TIME.toEpochMilli() - 30_000L;
        ZSetOperations.TypedTuple<String> oldestTuple = ZSetOperations.TypedTuple.of("oldest-id", (double) oldestTimestamp);
        Set<ZSetOperations.TypedTuple<String>> oldestSet = new LinkedHashSet<>();
        oldestSet.add(oldestTuple);
        when(zSetOps.rangeWithScores(key, 0, 0)).thenReturn(oldestSet);

        RateLimitResult result = rateLimiter.checkLimit(USER_ID, RateLimitType.WEBSOCKET);

        assertThat(result.allowed()).isFalse();
        assertThat(result.isDenied()).isTrue();
        // Oldest entry expires at oldestTimestamp + 60000 = BASE_TIME + 30000ms = 30 seconds from now
        assertThat(result.retryAfterSeconds()).isEqualTo(30);
        assertThat(result.type()).isEqualTo(RateLimitType.WEBSOCKET);
    }

    @Test
    void allowsFirstRequest() {
        String key = "ratelimit:rest:" + USER_ID;
        when(zSetOps.zCard(key)).thenReturn(0L);

        RateLimitResult result = rateLimiter.checkLimit(USER_ID, RateLimitType.REST);

        assertThat(result.allowed()).isTrue();
        assertThat(result.retryAfterSeconds()).isZero();
    }

    @Test
    void allowsRequestAtBoundary() {
        // 99 requests already in window (one below limit of 100)
        String key = "ratelimit:rest:" + USER_ID;
        when(zSetOps.zCard(key)).thenReturn(99L);

        RateLimitResult result = rateLimiter.checkLimit(USER_ID, RateLimitType.REST);

        assertThat(result.allowed()).isTrue();
    }

    @Test
    void getRetryAfterSecondsReturnsCorrectValue() {
        String key = "ratelimit:rest:" + USER_ID;
        long oldestTimestamp = BASE_TIME.toEpochMilli() - 45_000L;
        ZSetOperations.TypedTuple<String> oldestTuple = ZSetOperations.TypedTuple.of("oldest-id", (double) oldestTimestamp);
        Set<ZSetOperations.TypedTuple<String>> oldestSet = new LinkedHashSet<>();
        oldestSet.add(oldestTuple);
        when(zSetOps.rangeWithScores(key, 0, 0)).thenReturn(oldestSet);

        long retryAfter = rateLimiter.getRetryAfterSeconds(USER_ID, RateLimitType.REST);

        // Oldest entry expires at oldestTimestamp + 60000 = BASE_TIME + 15000ms = 15 seconds from now
        assertThat(retryAfter).isEqualTo(15);
    }

    @Test
    void getRetryAfterSecondsReturnsZeroWhenNoEntries() {
        String key = "ratelimit:rest:" + USER_ID;
        when(zSetOps.rangeWithScores(key, 0, 0)).thenReturn(Set.of());

        long retryAfter = rateLimiter.getRetryAfterSeconds(USER_ID, RateLimitType.REST);

        assertThat(retryAfter).isZero();
    }

    @Test
    void usesCorrectKeyPatternForRest() {
        String expectedKey = "ratelimit:rest:" + USER_ID;
        when(zSetOps.zCard(expectedKey)).thenReturn(0L);

        rateLimiter.checkLimit(USER_ID, RateLimitType.REST);

        verify(zSetOps).removeRangeByScore(eq(expectedKey), anyDouble(), anyDouble());
    }

    @Test
    void usesCorrectKeyPatternForWebSocket() {
        String expectedKey = "ratelimit:websocket:" + USER_ID;
        when(zSetOps.zCard(expectedKey)).thenReturn(0L);

        rateLimiter.checkLimit(USER_ID, RateLimitType.WEBSOCKET);

        verify(zSetOps).removeRangeByScore(eq(expectedKey), anyDouble(), anyDouble());
    }

    @Test
    void retryAfterRoundsUpToNextSecond() {
        String key = "ratelimit:rest:" + USER_ID;
        // Oldest entry is 59.5 seconds ago → expires in 0.5 seconds → rounds up to 1
        long oldestTimestamp = BASE_TIME.toEpochMilli() - 59_500L;
        ZSetOperations.TypedTuple<String> oldestTuple = ZSetOperations.TypedTuple.of("oldest-id", (double) oldestTimestamp);
        Set<ZSetOperations.TypedTuple<String>> oldestSet = new LinkedHashSet<>();
        oldestSet.add(oldestTuple);
        when(zSetOps.rangeWithScores(key, 0, 0)).thenReturn(oldestSet);

        long retryAfter = rateLimiter.getRetryAfterSeconds(USER_ID, RateLimitType.REST);

        assertThat(retryAfter).isEqualTo(1);
    }

    @Test
    void handlesNullZCardGracefully() {
        String key = "ratelimit:rest:" + USER_ID;
        when(zSetOps.zCard(key)).thenReturn(null);

        RateLimitResult result = rateLimiter.checkLimit(USER_ID, RateLimitType.REST);

        assertThat(result.allowed()).isTrue();
    }
}
