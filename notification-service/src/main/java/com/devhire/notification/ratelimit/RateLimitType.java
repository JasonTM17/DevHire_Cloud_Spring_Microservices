package com.devhire.notification.ratelimit;

/**
 * Defines the types of rate limiting applied in the system.
 * Each type has its own maximum request count and window size.
 *
 * <p>Requirements: 12.1, 12.2</p>
 */
public enum RateLimitType {

    /**
     * REST API rate limit: 100 requests per user per 60-second window.
     */
    REST(100, 60_000L),

    /**
     * WebSocket message rate limit: 50 messages per user per 60-second window.
     */
    WEBSOCKET(50, 60_000L);

    private final int maxRequests;
    private final long windowMs;

    RateLimitType(int maxRequests, long windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    /**
     * Maximum number of requests allowed within the window.
     */
    public int getMaxRequests() {
        return maxRequests;
    }

    /**
     * Window size in milliseconds.
     */
    public long getWindowMs() {
        return windowMs;
    }
}
