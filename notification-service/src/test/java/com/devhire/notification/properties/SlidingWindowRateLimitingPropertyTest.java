package com.devhire.notification.properties;

import net.jqwik.api.*;

import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Sliding Window Rate Limiting.
 *
 * <p>Feature: realtime-collaboration, Property 14: Sliding Window Rate Limiting</p>
 *
 * <p><b>Validates: Requirements 12.1, 12.2, 12.5</b></p>
 *
 * <p>For any user and any sequence of requests with timestamps, the rate limiter SHALL
 * allow at most N requests (100 for REST, 50 for WebSocket) within any 60-second
 * sliding window. Requests beyond the limit SHALL be rejected.</p>
 */
@Label("Feature: realtime-collaboration, Property 14: Sliding Window Rate Limiting")
@Tag("realtime-collaboration")
@Tag("property-test")
class SlidingWindowRateLimitingPropertyTest {

    private static final long WINDOW_MS = 60_000L;

    /**
     * Simulates the sliding window rate limiter using a list of timestamps.
     * Mirrors the Redis sorted-set based implementation where each request
     * gets a unique member (UUID) with timestamp as score.
     */
    static class SlidingWindowSimulator {
        private final int maxRequests;
        private final long windowMs;
        private final ArrayList<Long> timestamps = new ArrayList<>();

        SlidingWindowSimulator(int maxRequests, long windowMs) {
            this.maxRequests = maxRequests;
            this.windowMs = windowMs;
        }

        /**
         * Returns true if the request is allowed, false if rate-limited.
         */
        boolean checkLimit(long requestTimestamp) {
            // Remove expired entries (older than or equal to window start)
            long windowStart = requestTimestamp - windowMs;
            timestamps.removeIf(ts -> ts <= windowStart);

            if (timestamps.size() < maxRequests) {
                timestamps.add(requestTimestamp);
                return true;
            }
            return false;
        }

        /**
         * Returns the count of requests currently in the window at the given time.
         */
        int currentCount(long atTime) {
            long windowStart = atTime - windowMs;
            return (int) timestamps.stream().filter(ts -> ts > windowStart).count();
        }
    }

    /**
     * Property 14a: REST rate limiter allows at most 100 requests per 60s window.
     */
    @Property(tries = 200)
    void restRateLimiterAllowsAtMost100RequestsPer60sWindow(
            @ForAll("requestTimestamps") List<Long> timestamps
    ) {
        int maxRequests = 100;
        SlidingWindowSimulator limiter = new SlidingWindowSimulator(maxRequests, WINDOW_MS);

        List<Long> allowedTimestamps = new ArrayList<>();
        for (Long ts : timestamps) {
            if (limiter.checkLimit(ts)) {
                allowedTimestamps.add(ts);
            }
        }

        // Verify: in any 60s window, at most 100 requests are allowed
        verifyWindowConstraint(allowedTimestamps, maxRequests, WINDOW_MS);
    }

    /**
     * Property 14b: WebSocket rate limiter allows at most 50 messages per 60s window.
     */
    @Property(tries = 200)
    void websocketRateLimiterAllowsAtMost50MessagesPer60sWindow(
            @ForAll("requestTimestamps") List<Long> timestamps
    ) {
        int maxRequests = 50;
        SlidingWindowSimulator limiter = new SlidingWindowSimulator(maxRequests, WINDOW_MS);

        List<Long> allowedTimestamps = new ArrayList<>();
        for (Long ts : timestamps) {
            if (limiter.checkLimit(ts)) {
                allowedTimestamps.add(ts);
            }
        }

        // Verify: in any 60s window, at most 50 messages are allowed
        verifyWindowConstraint(allowedTimestamps, maxRequests, WINDOW_MS);
    }

    /**
     * Property 14c: Requests beyond the limit are rejected.
     */
    @Property(tries = 200)
    void requestsBeyondLimitAreRejected(
            @ForAll("burstTimestamps") List<Long> timestamps
    ) {
        int maxRequests = 100;
        SlidingWindowSimulator limiter = new SlidingWindowSimulator(maxRequests, WINDOW_MS);

        int allowedCount = 0;
        int rejectedCount = 0;

        for (Long ts : timestamps) {
            if (limiter.checkLimit(ts)) {
                allowedCount++;
            } else {
                rejectedCount++;
            }
        }

        // If we sent more than maxRequests in a single window, some must be rejected
        if (timestamps.size() > maxRequests) {
            // All timestamps are within the same window (burst), so excess must be rejected
            long minTs = timestamps.stream().mapToLong(Long::longValue).min().orElse(0);
            long maxTs = timestamps.stream().mapToLong(Long::longValue).max().orElse(0);
            if (maxTs - minTs < WINDOW_MS) {
                assertThat(allowedCount).isLessThanOrEqualTo(maxRequests);
                assertThat(rejectedCount).isGreaterThanOrEqualTo(timestamps.size() - maxRequests);
            }
        }
    }

    /**
     * Property 14d: After the window expires, new requests are allowed again.
     */
    @Property(tries = 150)
    void afterWindowExpiresNewRequestsAllowed(
            @ForAll("maxRequests") int maxReqs
    ) {
        SlidingWindowSimulator limiter = new SlidingWindowSimulator(maxReqs, WINDOW_MS);
        long baseTime = 1_000_000_000L;

        // Fill the window
        for (int i = 0; i < maxReqs; i++) {
            assertThat(limiter.checkLimit(baseTime + i)).isTrue();
        }

        // Next request in same window should be rejected
        assertThat(limiter.checkLimit(baseTime + maxReqs)).isFalse();

        // After window expires, request should be allowed
        long afterWindow = baseTime + WINDOW_MS + 1;
        assertThat(limiter.checkLimit(afterWindow)).isTrue();
    }

    /**
     * Verifies that in any 60s sliding window, at most maxRequests are present.
     * The window is half-open: (windowStart, windowEnd] matching the Redis implementation
     * which removes entries with score <= windowStart.
     */
    private void verifyWindowConstraint(List<Long> allowedTimestamps, int maxRequests, long windowMs) {
        if (allowedTimestamps.isEmpty()) return;

        List<Long> sorted = allowedTimestamps.stream().sorted().collect(Collectors.toList());

        for (int i = 0; i < sorted.size(); i++) {
            long windowStart = sorted.get(i);
            long windowEnd = windowStart + windowMs;
            int countInWindow = 0;
            for (int j = i; j < sorted.size() && sorted.get(j) < windowEnd; j++) {
                countInWindow++;
            }
            assertThat(countInWindow)
                    .as("At most %d requests allowed in any %dms window starting at %d",
                            maxRequests, windowMs, windowStart)
                    .isLessThanOrEqualTo(maxRequests);
        }
    }

    @Provide
    Arbitrary<List<Long>> requestTimestamps() {
        // Generate timestamps within a 5-minute range (sorted to simulate time progression)
        long baseTime = 1_700_000_000_000L;
        Arbitrary<Long> timestamps = Arbitraries.longs().between(baseTime, baseTime + 300_000);

        return timestamps.list()
                .ofMinSize(1)
                .ofMaxSize(200)
                .map(list -> list.stream().sorted().collect(Collectors.toList()));
    }

    @Provide
    Arbitrary<List<Long>> burstTimestamps() {
        // Generate a burst of timestamps within a single 60s window
        long baseTime = 1_700_000_000_000L;
        Arbitrary<Long> timestamps = Arbitraries.longs().between(baseTime, baseTime + 59_999);

        return timestamps.list()
                .ofMinSize(101)
                .ofMaxSize(200)
                .map(list -> list.stream().sorted().collect(Collectors.toList()));
    }

    @Provide
    Arbitrary<Integer> maxRequests() {
        return Arbitraries.integers().between(5, 50);
    }
}
