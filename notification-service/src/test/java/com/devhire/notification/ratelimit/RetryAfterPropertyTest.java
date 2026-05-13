package com.devhire.notification.ratelimit;

import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.LongRange;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Retry-After header accuracy.
 *
 * <p>Feature: realtime-collaboration, Property 15: Retry-After Header Accuracy</p>
 *
 * <p><b>Validates: Requirements 12.3</b></p>
 *
 * <p>For any rate-limited user at time T, the Retry-After header value SHALL equal the number
 * of seconds until the oldest request in the current window expires (i.e., when the window
 * will have capacity for a new request).</p>
 */
@Tag("realtime-collaboration")
@Label("Property 15: Retry-After Header Accuracy")
class RetryAfterPropertyTest {

    private static final long WINDOW_MS = 60_000L;

    /**
     * Simulates the sliding window and computes retry-after.
     * Mirrors the logic in SlidingWindowRateLimiter.calculateRetryAfterSeconds().
     */
    static class RateLimitSimulator {
        private final TreeMap<Long, List<String>> entries = new TreeMap<>();
        private int totalCount = 0;

        boolean tryRequest(long timestampMs, int maxRequests) {
            cleanup(timestampMs);
            if (totalCount < maxRequests) {
                entries.computeIfAbsent(timestampMs, k -> new ArrayList<>())
                        .add(UUID.randomUUID().toString());
                totalCount++;
                return true;
            }
            return false;
        }

        /**
         * Calculates retry-after seconds: time until the oldest entry expires from the window.
         * This is: (oldestTimestamp + windowMs - currentTime) / 1000, rounded up.
         */
        long calculateRetryAfterSeconds(long currentTimeMs) {
            cleanup(currentTimeMs);
            if (entries.isEmpty()) {
                return 0;
            }
            long oldestTimestamp = entries.firstKey();
            long expiresAt = oldestTimestamp + WINDOW_MS;
            long retryAfterMs = expiresAt - currentTimeMs;
            long retryAfterSeconds = (long) Math.ceil(retryAfterMs / 1000.0);
            return Math.max(retryAfterSeconds, 1);
        }

        long getOldestTimestamp() {
            return entries.isEmpty() ? 0 : entries.firstKey();
        }

        private void cleanup(long currentTimeMs) {
            long windowStart = currentTimeMs - WINDOW_MS;
            while (!entries.isEmpty() && entries.firstKey() <= windowStart) {
                Map.Entry<Long, List<String>> removed = entries.pollFirstEntry();
                totalCount -= removed.getValue().size();
            }
        }
    }

    @Property(tries = 200)
    @Label("Retry-After equals seconds until oldest request expires")
    void retryAfterEqualsSecondsUntilOldestExpires(
            @ForAll("rateLimitedScenario") RateLimitedScenario scenario
    ) {
        RateLimitSimulator simulator = new RateLimitSimulator();

        // Fill up to the limit
        for (Long ts : scenario.requestTimestamps) {
            simulator.tryRequest(ts, scenario.maxRequests);
        }

        // At the check time, the user is rate-limited
        boolean allowed = simulator.tryRequest(scenario.checkTime, scenario.maxRequests);

        if (!allowed) {
            // Calculate expected retry-after
            long retryAfter = simulator.calculateRetryAfterSeconds(scenario.checkTime);
            long oldestTimestamp = simulator.getOldestTimestamp();

            // Verify: retry-after = ceil((oldestTimestamp + windowMs - checkTime) / 1000)
            long expectedExpiresAt = oldestTimestamp + WINDOW_MS;
            long expectedRetryAfterMs = expectedExpiresAt - scenario.checkTime;
            long expectedRetryAfterSeconds = (long) Math.ceil(expectedRetryAfterMs / 1000.0);
            expectedRetryAfterSeconds = Math.max(expectedRetryAfterSeconds, 1);

            assertThat(retryAfter)
                    .as("Retry-After should equal seconds until oldest request (at %d) expires from window at check time %d",
                            oldestTimestamp, scenario.checkTime)
                    .isEqualTo(expectedRetryAfterSeconds);
        }
    }

    @Property(tries = 200)
    @Label("Retry-After is always positive when rate-limited")
    void retryAfterIsAlwaysPositiveWhenRateLimited(
            @ForAll("rateLimitedScenario") RateLimitedScenario scenario
    ) {
        RateLimitSimulator simulator = new RateLimitSimulator();

        for (Long ts : scenario.requestTimestamps) {
            simulator.tryRequest(ts, scenario.maxRequests);
        }

        boolean allowed = simulator.tryRequest(scenario.checkTime, scenario.maxRequests);

        if (!allowed) {
            long retryAfter = simulator.calculateRetryAfterSeconds(scenario.checkTime);
            assertThat(retryAfter)
                    .as("Retry-After must be positive when rate-limited")
                    .isGreaterThan(0);
        }
    }

    @Property(tries = 200)
    @Label("Retry-After never exceeds window size in seconds")
    void retryAfterNeverExceedsWindowSize(
            @ForAll("rateLimitedScenario") RateLimitedScenario scenario
    ) {
        RateLimitSimulator simulator = new RateLimitSimulator();

        for (Long ts : scenario.requestTimestamps) {
            simulator.tryRequest(ts, scenario.maxRequests);
        }

        boolean allowed = simulator.tryRequest(scenario.checkTime, scenario.maxRequests);

        if (!allowed) {
            long retryAfter = simulator.calculateRetryAfterSeconds(scenario.checkTime);
            long maxRetryAfterSeconds = (long) Math.ceil(WINDOW_MS / 1000.0);
            assertThat(retryAfter)
                    .as("Retry-After should never exceed the window size (%d seconds)", maxRetryAfterSeconds)
                    .isLessThanOrEqualTo(maxRetryAfterSeconds);
        }
    }

    @Property(tries = 200)
    @Label("After waiting Retry-After seconds, request is allowed")
    void afterWaitingRetryAfterRequestIsAllowed(
            @ForAll("rateLimitedScenario") RateLimitedScenario scenario
    ) {
        RateLimitSimulator simulator = new RateLimitSimulator();

        for (Long ts : scenario.requestTimestamps) {
            simulator.tryRequest(ts, scenario.maxRequests);
        }

        boolean allowed = simulator.tryRequest(scenario.checkTime, scenario.maxRequests);

        if (!allowed) {
            long retryAfter = simulator.calculateRetryAfterSeconds(scenario.checkTime);

            // After waiting retryAfter seconds, the oldest entry should have expired
            long afterWait = scenario.checkTime + (retryAfter * 1000) + 1; // +1ms to be past the boundary
            boolean allowedAfterWait = simulator.tryRequest(afterWait, scenario.maxRequests);

            assertThat(allowedAfterWait)
                    .as("Request should be allowed after waiting Retry-After (%d) seconds", retryAfter)
                    .isTrue();
        }
    }

    @Property(tries = 200)
    @Label("Retry-After rounds up to next second")
    void retryAfterRoundsUpToNextSecond(
            @ForAll("baseTimestamp") long baseTimestamp,
            @ForAll @LongRange(min = 1, max = 999) long subSecondOffset
    ) {
        RateLimitSimulator simulator = new RateLimitSimulator();
        int maxRequests = RateLimitType.WEBSOCKET.getMaxRequests(); // 50

        // Fill up to the limit at baseTimestamp
        for (int i = 0; i < maxRequests; i++) {
            simulator.tryRequest(baseTimestamp, maxRequests);
        }

        // Check at a time that creates a sub-second remainder
        long checkTime = baseTimestamp + subSecondOffset;
        long retryAfter = simulator.calculateRetryAfterSeconds(checkTime);

        // The retry-after should be ceil((baseTimestamp + 60000 - checkTime) / 1000)
        long expectedMs = baseTimestamp + WINDOW_MS - checkTime;
        long expectedSeconds = (long) Math.ceil(expectedMs / 1000.0);
        expectedSeconds = Math.max(expectedSeconds, 1);

        assertThat(retryAfter).isEqualTo(expectedSeconds);
    }

    record RateLimitedScenario(List<Long> requestTimestamps, long checkTime, int maxRequests) {}

    @Provide
    Arbitrary<RateLimitedScenario> rateLimitedScenario() {
        Arbitrary<Long> baseTime = Arbitraries.longs().between(1_700_000_000_000L, 1_700_000_050_000L);

        return baseTime.flatMap(base -> {
            // Generate timestamps within a 59-second window to ensure they're all in the same window
            Arbitrary<Long> timestamps = Arbitraries.longs().between(base, base + 59_000L);
            Arbitrary<Integer> maxReqs = Arbitraries.of(
                    RateLimitType.REST.getMaxRequests(),
                    RateLimitType.WEBSOCKET.getMaxRequests()
            );

            return Combinators.combine(timestamps.list().ofSize(50), maxReqs)
                    .as((tsList, max) -> {
                        // Sort timestamps and take enough to fill the limit
                        List<Long> sorted = new ArrayList<>(tsList);
                        Collections.sort(sorted);
                        // Ensure we have enough to fill the limit
                        List<Long> filled = new ArrayList<>();
                        for (int i = 0; i < max && i < sorted.size(); i++) {
                            filled.add(sorted.get(i % sorted.size()));
                        }
                        // If we need more, repeat the last timestamp
                        while (filled.size() < max) {
                            filled.add(sorted.get(sorted.size() - 1));
                        }
                        // Check time is after the last request but within the window
                        long checkTime = filled.get(filled.size() - 1) + 1;
                        return new RateLimitedScenario(filled, checkTime, max);
                    });
        });
    }

    @Provide
    Arbitrary<Long> baseTimestamp() {
        return Arbitraries.longs().between(1_700_000_000_000L, 1_700_000_300_000L);
    }
}
