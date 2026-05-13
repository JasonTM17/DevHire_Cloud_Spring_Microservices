package com.devhire.notification.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Assigns monotonically increasing sequence numbers per user for notification ordering.
 * Uses Redis INCR on key {@code seq:user:{userId}} for atomic monotonic sequence generation.
 */
@Component
public class NotificationSequencer {

    private static final String SEQUENCE_KEY_PREFIX = "seq:user:";

    private final StringRedisTemplate redisTemplate;

    public NotificationSequencer(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Returns the next sequence number for the given user.
     * Each call atomically increments the counter, guaranteeing uniqueness and monotonicity.
     *
     * @param userId the user identifier
     * @return the next sequence number (starts at 1 for a new user)
     */
    public long nextSequence(String userId) {
        Long sequence = redisTemplate.opsForValue().increment(SEQUENCE_KEY_PREFIX + userId);
        if (sequence == null) {
            throw new IllegalStateException("Redis INCR returned null for user: " + userId);
        }
        return sequence;
    }

    /**
     * Returns the current sequence number for the given user without incrementing.
     * Returns 0 if no sequence has been assigned yet.
     *
     * @param userId the user identifier
     * @return the current sequence number, or 0 if none exists
     */
    public long getCurrentSequence(String userId) {
        String value = redisTemplate.opsForValue().get(SEQUENCE_KEY_PREFIX + userId);
        return value == null ? 0L : Long.parseLong(value);
    }
}
