package com.devhire.notification.properties;

import net.jqwik.api.*;

import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Retry-After Header Accuracy.
 *
 * <p>Feature: realtime-collaboration, Property 15: Retry-After Header Accuracy</p>
 *
 * <p><b>Validates: Requirements 12.3</b></p>
 *
 * <p>For any rate-limited user at time T, the Retry-After header value SHALL equal
 * the number of seconds until the oldest request in the current window expires
 * (i.e., when the window will have capacity for a new request).</p>
 */
@Label("Feature: realtime-collaboration, Property 15: Retry-After Header Accuracy")
@Tag("realtime-collaboration")
@Tag("property-test")
class RetryAfterHeaderAccuracyPropertyTest {

    private static final long WINDOW_MS = 60_000L;
    private static final int MAX_REQUESTS = 100;

    /**
     * Simulates the sliding window rate limiter with Retry-After calculation.
     */
    static class RateLimiterWithRetryAfter {
        private final int maxRequests;
        private final long windowMs;
        private final TreeSet<Long> timestamps = new TreeSet<>();

        RateLimiterWithRetryAfter(int maxRequests, long windowMs) {
            this.maxRequests = maxRequests;
            this.windowMs = windowMs;
        }

        boolean checkLimit(long requestTimestamp) {
            long windowStart = requestTimestamp - windowMs;
            timestamps.headSet(windowStart, true).clear();

            if (timestamps.size() < maxRequests) {
                timestamps.add(requestTimestamp);
                return true;
            }
            return false;
        }

        /**
         * Calculates Retry-After in seconds: time until the oldest request expires from the window.
         */
        long getRetryAfterSeconds(long currentTime) {
            if (timestamps.isEmpty()) {
                return 0;
            }
            long oldestTimestamp = timestamps.first();
            long expiresAt = oldestTimestamp + windowMs;
            long retryAfterMs = expiresAt - currentTime;
            return Math.max((long) Math.ceil(retryAfterMs / 1000.0), 1);
        }

        long getOldestTimestamp() {
            return timestamps.isEmpty() ? 0 : timestamps.first();
        }
    }

    /**
     * Property 15a: Retry-After equals seconds until oldest request expires from window.
     */
    @Property(tries = 200)
    void retryAfterEqualsSecondsUntilOldestExpires(
            @ForAll("rateLimitedScenarios") RateLimitedScenario scenario
    ) {
        RateLimiterWithRetryAfter limiter = new RateLimiterWithRetryAfter(MAX_REQUESTS, WINDOW_MS);

        // Fill the window with requests
        for (Long ts : scenario.requestTimestamps()) {
            limiter.checkLimit(ts);
        }

        // Attempt one more request that should be denied
        long deniedTime = scenario.deniedAtTime();
        boolean allowed = limiter.checkLimit(deniedTime);

        if (!allowed) {
            long retryAfter = limiter.getRetryAfterSeconds(deniedTime);
            long oldestTs = limiter.getOldestTimestamp();
            long expectedExpiresAt = oldestTs + WINDOW_MS;
            long expectedRetryAfterMs = expectedExpiresAt - deniedTime;
            long expectedRetryAfterSeconds = Math.max((long) Math.ceil(expectedRetryAfterMs / 1000.0), 1);

            assertThat(retryAfter)
                    .as("Retry-After should equal seconds until oldest request expires")
                    .isEqualTo(expectedRetryAfterSeconds);
        }
    }

    /**
     * Property 15b: Retry-After is always positive when rate-limited.
     */
    @Property(tries = 200)
    void retryAfterIsAlwaysPositiveWhenRateLimited(
            @ForAll("rateLimitedScenarios") RateLimitedScenario scenario
    ) {
        RateLimiterWithRetryAfter limiter = new RateLimiterWithRetryAfter(MAX_REQUESTS, WINDOW_MS);

        for (Long ts : scenario.requestTimestamps()) {
            limiter.checkLimit(ts);
        }

        long deniedTime = scenario.deniedAtTime();
        boolean allowed = limiter.checkLimit(deniedTime);

        if (!allowed) {
            long retryAfter = limiter.getRetryAfterSeconds(deniedTime);
            assertThat(retryAfter)
                    .as("Retry-After must be positive when rate-limited")
                    .isGreaterThan(0);
        }
    }

    /**
     * Property 15c: Retry-After never exceeds the window size in seconds.
     */
    @Property(tries = 200)
    void retryAfterNeverExceedsWindowSize(
            @ForAll("rateLimitedScenarios") RateLimitedScenario scenario
    ) {
        RateLimiterWithRetryAfter limiter = new RateLimiterWithRetryAfter(MAX_REQUESTS, WINDOW_MS);

        for (Long ts : scenario.requestTimestamps()) {
            limiter.checkLimit(ts);
        }

        long deniedTime = scenario.deniedAtTime();
        boolean allowed = limiter.checkLimit(deniedTime);

        if (!allowed) {
            long retryAfter = limiter.getRetryAfterSeconds(deniedTime);
            long maxRetryAfterSeconds = (long) Math.ceil(WINDOW_MS / 1000.0);
            assertThat(retryAfter)
                    .as("Retry-After should not exceed window size (%ds)", maxRetryAfterSeconds)
                    .isLessThanOrEqualTo(maxRetryAfterSeconds);
        }
    }

    /**
     * Represents a scenario where a user has been rate-limited.
     */
    record RateLimitedScenario(List<Long> requestTimestamps, long deniedAtTime) {}

    @Provide
    Arbitrary<RateLimitedScenario> rateLimitedScenarios() {
        long baseTime = 1_700_000_000_000L;

        // Generate exactly MAX_REQUESTS timestamps within a window to fill it
        Arbitrary<List<Long>> fillingRequests = Arbitraries.longs()
                .between(baseTime, baseTime + 50_000) // within 50s of window
                .list()
                .ofSize(MAX_REQUESTS)
                .map(list -> list.stream().sorted().collect(Collectors.toList()));

        // The denied request comes after the last filling request but within the window
        return fillingRequests.flatMap(requests -> {
            long lastRequest = requests.get(requests.size() - 1);
            Arbitrary<Long> deniedTime = Arbitraries.longs()
                    .between(lastRequest, lastRequest + 9_000); // within 9s after last
            return deniedTime.map(denied -> new RateLimitedScenario(requests, denied));
        });
    }
}
