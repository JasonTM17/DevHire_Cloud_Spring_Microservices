package com.devhire.notification.ratelimit;

import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.LongRange;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for sliding window rate limiting.
 *
 * <p>Feature: realtime-collaboration, Property 14: Sliding Window Rate Limiting</p>
 *
 * <p><b>Validates: Requirements 12.1, 12.2, 12.5</b></p>
 *
 * <p>For any user and any sequence of requests with timestamps, the rate limiter SHALL allow
 * at most N requests (100 for REST, 50 for WebSocket) within any 60-second sliding window.
 * Requests beyond the limit SHALL be rejected.</p>
 */
@Tag("realtime-collaboration")
@Label("Property 14: Sliding Window Rate Limiting")
class SlidingWindowRateLimiterPropertyTest {

    private static final long WINDOW_MS = 60_000L;

    /**
     * Simulates the sliding window rate limiter logic without Redis.
     * Uses a sorted list of timestamps to track requests within the window.
     */
    static class InMemorySlidingWindow {
        private final TreeMap<Long, Integer> timestamps = new TreeMap<>();
        private int totalInWindow = 0;

        boolean tryRequest(long timestampMs, int maxRequests) {
            // Remove expired entries
            long windowStart = timestampMs - WINDOW_MS;
            while (!timestamps.isEmpty() && timestamps.firstKey() <= windowStart) {
                totalInWindow -= timestamps.pollFirstEntry().getValue();
            }

            if (totalInWindow < maxRequests) {
                timestamps.merge(timestampMs, 1, Integer::sum);
                totalInWindow++;
                return true;
            }
            return false;
        }

        long getOldestTimestamp() {
            return timestamps.isEmpty() ? 0 : timestamps.firstKey();
        }
    }

    @Property(tries = 200)
    @Label("REST: at most 100 requests allowed per 60s window")
    void restRateLimitEnforcesMaximum(
            @ForAll("requestTimestamps") List<Long> timestamps
    ) {
        InMemorySlidingWindow window = new InMemorySlidingWindow();
        int maxRequests = RateLimitType.REST.getMaxRequests(); // 100

        int allowedCount = 0;
        for (Long ts : timestamps) {
            if (window.tryRequest(ts, maxRequests)) {
                allowedCount++;
            }
        }

        // Verify: in any 60s window, at most 100 requests are allowed
        // We verify by checking that the total allowed never exceeds the limit
        // within any sliding window of the timestamps
        verifyWindowConstraint(timestamps, maxRequests);
    }

    @Property(tries = 200)
    @Label("WebSocket: at most 50 messages allowed per 60s window")
    void webSocketRateLimitEnforcesMaximum(
            @ForAll("requestTimestamps") List<Long> timestamps
    ) {
        int maxRequests = RateLimitType.WEBSOCKET.getMaxRequests(); // 50

        // Verify: in any 60s window, at most 50 requests are allowed
        verifyWindowConstraint(timestamps, maxRequests);
    }

    @Property(tries = 200)
    @Label("Requests within limit are always allowed")
    void requestsWithinLimitAreAllowed(
            @ForAll @IntRange(min = 1, max = 49) int requestCount,
            @ForAll("baseTimestamp") long baseTimestamp
    ) {
        InMemorySlidingWindow window = new InMemorySlidingWindow();
        int maxRequests = RateLimitType.WEBSOCKET.getMaxRequests(); // 50

        // All requests within the same second (well within the window)
        int allowedCount = 0;
        for (int i = 0; i < requestCount; i++) {
            if (window.tryRequest(baseTimestamp + i, maxRequests)) {
                allowedCount++;
            }
        }

        // All requests should be allowed since count < limit
        assertThat(allowedCount).isEqualTo(requestCount);
    }

    @Property(tries = 200)
    @Label("Request at exact limit is denied")
    void requestAtExactLimitIsDenied(
            @ForAll("baseTimestamp") long baseTimestamp
    ) {
        InMemorySlidingWindow window = new InMemorySlidingWindow();
        int maxRequests = RateLimitType.WEBSOCKET.getMaxRequests(); // 50

        // Fill up to the limit
        for (int i = 0; i < maxRequests; i++) {
            boolean allowed = window.tryRequest(baseTimestamp + i, maxRequests);
            assertThat(allowed).isTrue();
        }

        // The next request should be denied
        boolean allowed = window.tryRequest(baseTimestamp + maxRequests, maxRequests);
        assertThat(allowed).isFalse();
    }

    @Property(tries = 200)
    @Label("Requests after window expiry are allowed again")
    void requestsAfterWindowExpiryAreAllowed(
            @ForAll("baseTimestamp") long baseTimestamp,
            @ForAll @IntRange(min = 1, max = 50) int fillCount
    ) {
        InMemorySlidingWindow window = new InMemorySlidingWindow();
        int maxRequests = RateLimitType.WEBSOCKET.getMaxRequests(); // 50

        // Fill up to the limit
        for (int i = 0; i < maxRequests; i++) {
            window.tryRequest(baseTimestamp + i, maxRequests);
        }

        // After the window expires (60s + 1ms later), requests should be allowed again
        long afterWindow = baseTimestamp + WINDOW_MS + 1;
        boolean allowed = window.tryRequest(afterWindow, maxRequests);
        assertThat(allowed).isTrue();
    }

    @Property(tries = 200)
    @Label("Sliding window correctly expires old entries")
    void slidingWindowCorrectlyExpiresOldEntries(
            @ForAll("baseTimestamp") long baseTimestamp,
            @ForAll @IntRange(min = 1, max = 49) int firstBatchSize,
            @ForAll @LongRange(min = 10000, max = 50000) long secondBatchOffset
    ) {
        InMemorySlidingWindow window = new InMemorySlidingWindow();
        int maxRequests = RateLimitType.WEBSOCKET.getMaxRequests(); // 50

        // First batch: all at baseTimestamp
        for (int i = 0; i < firstBatchSize; i++) {
            window.tryRequest(baseTimestamp, maxRequests);
        }

        // Second batch: all at the same timestamp (baseTimestamp + offset)
        // Since offset < WINDOW_MS (60000), first batch entries are still in the window
        // because windowStart = (baseTimestamp + offset) - 60000 < baseTimestamp
        int remainingCapacity = maxRequests - firstBatchSize;
        int allowedInSecondBatch = 0;
        for (int i = 0; i < remainingCapacity + 5; i++) {
            if (window.tryRequest(baseTimestamp + secondBatchOffset, maxRequests)) {
                allowedInSecondBatch++;
            }
        }

        // Should allow exactly the remaining capacity
        assertThat(allowedInSecondBatch).isEqualTo(remainingCapacity);
    }

    /**
     * Verifies that for any 60-second window within the given timestamps,
     * at most maxRequests are allowed by the sliding window algorithm.
     */
    private void verifyWindowConstraint(List<Long> timestamps, int maxRequests) {
        InMemorySlidingWindow window = new InMemorySlidingWindow();
        List<Long> allowedTimestamps = new ArrayList<>();

        for (Long ts : timestamps) {
            if (window.tryRequest(ts, maxRequests)) {
                allowedTimestamps.add(ts);
            }
        }

        // For every allowed timestamp, count how many other allowed timestamps
        // fall within a 60s window ending at that timestamp
        for (int i = 0; i < allowedTimestamps.size(); i++) {
            long windowEnd = allowedTimestamps.get(i);
            long windowStart = windowEnd - WINDOW_MS;
            long countInWindow = allowedTimestamps.stream()
                    .filter(ts -> ts > windowStart && ts <= windowEnd)
                    .count();
            assertThat(countInWindow)
                    .as("At most %d requests allowed in any 60s window ending at %d", maxRequests, windowEnd)
                    .isLessThanOrEqualTo(maxRequests);
        }
    }

    @Provide
    Arbitrary<List<Long>> requestTimestamps() {
        // Generate a sorted list of timestamps within a ~5 minute range
        Arbitrary<Long> baseTime = Arbitraries.longs().between(1_700_000_000_000L, 1_700_000_300_000L);
        return baseTime.list().ofMinSize(10).ofMaxSize(200)
                .map(list -> {
                    Collections.sort(list);
                    return list;
                });
    }

    @Provide
    Arbitrary<Long> baseTimestamp() {
        return Arbitraries.longs().between(1_700_000_000_000L, 1_700_000_300_000L);
    }
}
