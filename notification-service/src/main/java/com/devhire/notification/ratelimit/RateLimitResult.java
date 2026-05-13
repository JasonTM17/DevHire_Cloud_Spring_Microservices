package com.devhire.notification.ratelimit;

/**
 * Result of a rate limit check indicating whether the request is allowed or denied,
 * and how long the caller should wait before retrying if denied.
 *
 * <p>Requirements: 12.3, 12.4</p>
 *
 * @param allowed          true if the request is within the rate limit, false if denied
 * @param retryAfterSeconds seconds until the window has capacity for a new request (0 if allowed)
 * @param type             the rate limit type that was checked
 */
public record RateLimitResult(
        boolean allowed,
        long retryAfterSeconds,
        RateLimitType type
) {

    /**
     * Creates an allowed result.
     */
    public static RateLimitResult allowed(RateLimitType type) {
        return new RateLimitResult(true, 0, type);
    }

    /**
     * Creates a denied result with the specified retry-after duration.
     *
     * @param retryAfterSeconds seconds until the oldest request in the window expires
     * @param type              the rate limit type
     */
    public static RateLimitResult denied(long retryAfterSeconds, RateLimitType type) {
        return new RateLimitResult(false, retryAfterSeconds, type);
    }

    /**
     * Returns true if the request was denied (rate limit exceeded).
     */
    public boolean isDenied() {
        return !allowed;
    }
}
