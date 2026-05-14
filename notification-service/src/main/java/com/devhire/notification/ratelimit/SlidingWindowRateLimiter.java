package com.devhire.notification.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

/**
 * Redis sorted-set based sliding window rate limiter for REST and WebSocket requests.
 *
 * <p>Uses Redis sorted sets with timestamp-based scoring to implement a sliding window
 * algorithm. Each request is stored as a unique member (UUID) with the current timestamp
 * as its score. Expired entries (older than the window) are removed before counting.</p>
 *
 * <p>Key pattern: {@code ratelimit:{type}:{userId}} with TTL of 120s (2x window size).</p>
 *
 * <p>Requirements: 12.1, 12.2, 12.3, 12.4, 12.5</p>
 */
@Component
public class SlidingWindowRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(SlidingWindowRateLimiter.class);
    private static final String KEY_PREFIX = "ratelimit:";
    private static final Duration KEY_TTL = Duration.ofSeconds(120);

    private final StringRedisTemplate redisTemplate;
    private final Clock clock;

    @Autowired
    public SlidingWindowRateLimiter(StringRedisTemplate redisTemplate) {
        this(redisTemplate, Clock.systemUTC());
    }

    /**
     * Constructor with injectable clock for testing.
     */
    SlidingWindowRateLimiter(StringRedisTemplate redisTemplate, Clock clock) {
        this.redisTemplate = redisTemplate;
        this.clock = clock;
    }

    /**
     * Checks whether the user is within the rate limit for the given type.
     * If allowed, records the request in the sliding window.
     * If denied, calculates the Retry-After duration.
     *
     * <p>Algorithm:
     * <ol>
     *   <li>Remove expired entries (score &lt; now - windowMs)</li>
     *   <li>Count remaining entries in the sorted set</li>
     *   <li>If count &lt; maxRequests, add new entry and return allowed</li>
     *   <li>If count &gt;= maxRequests, calculate retry-after and return denied</li>
     * </ol>
     * </p>
     *
     * @param userId the user identifier
     * @param type   the rate limit type (REST or WEBSOCKET)
     * @return the rate limit result indicating allowed/denied status
     */
    public RateLimitResult checkLimit(String userId, RateLimitType type) {
        String key = buildKey(userId, type);
        long now = clock.millis();
        long windowStart = now - type.getWindowMs();

        ZSetOperations<String, String> zSetOps = redisTemplate.opsForZSet();

        // Remove expired entries (score < windowStart)
        zSetOps.removeRangeByScore(key, Double.NEGATIVE_INFINITY, windowStart);

        // Count current entries in the window
        Long count = zSetOps.zCard(key);
        long currentCount = (count != null) ? count : 0;

        if (currentCount < type.getMaxRequests()) {
            // Allowed: add new entry with current timestamp as score
            String member = UUID.randomUUID().toString();
            zSetOps.add(key, member, now);

            // Set TTL to 2x window size for automatic cleanup
            redisTemplate.expire(key, KEY_TTL);

            log.debug("Rate limit check ALLOWED for user={}, type={}, count={}/{}",
                    userId, type, currentCount + 1, type.getMaxRequests());

            return RateLimitResult.allowed(type);
        } else {
            // Denied: calculate retry-after based on oldest entry in window
            long retryAfterSeconds = calculateRetryAfterSeconds(key, now, type);

            log.info("Rate limit EXCEEDED for user={}, type={}, count={}/{}, retryAfter={}s",
                    userId, type, currentCount, type.getMaxRequests(), retryAfterSeconds);

            return RateLimitResult.denied(retryAfterSeconds, type);
        }
    }

    /**
     * Calculates the number of seconds until the oldest request in the current window
     * expires, which is when the window will have capacity for a new request.
     *
     * @param userId the user identifier
     * @param type   the rate limit type
     * @return seconds until the oldest request expires from the window
     */
    public long getRetryAfterSeconds(String userId, RateLimitType type) {
        String key = buildKey(userId, type);
        long now = clock.millis();
        return calculateRetryAfterSeconds(key, now, type);
    }

    /**
     * Calculates retry-after seconds based on the oldest entry in the sorted set.
     * The oldest entry's score (timestamp) + windowMs gives the time when it will
     * expire from the window. The difference from now is the retry-after duration.
     */
    private long calculateRetryAfterSeconds(String key, long now, RateLimitType type) {
        ZSetOperations<String, String> zSetOps = redisTemplate.opsForZSet();

        // Get the oldest entry (lowest score = earliest timestamp)
        Set<ZSetOperations.TypedTuple<String>> oldest = zSetOps.rangeWithScores(key, 0, 0);

        if (oldest == null || oldest.isEmpty()) {
            return 0;
        }

        ZSetOperations.TypedTuple<String> oldestEntry = oldest.iterator().next();
        Double oldestScore = oldestEntry.getScore();

        if (oldestScore == null) {
            return 0;
        }

        // Time when the oldest entry will expire from the window
        long expiresAt = oldestScore.longValue() + type.getWindowMs();
        long retryAfterMs = expiresAt - now;

        // Convert to seconds, rounding up to ensure the window has actually cleared
        long retryAfterSeconds = (long) Math.ceil(retryAfterMs / 1000.0);

        return Math.max(retryAfterSeconds, 1);
    }

    /**
     * Builds the Redis key for the rate limit sorted set.
     * Pattern: ratelimit:{type}:{userId}
     */
    private String buildKey(String userId, RateLimitType type) {
        return KEY_PREFIX + type.name().toLowerCase() + ":" + userId;
    }
}
