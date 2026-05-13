package com.devhire.notification.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Cache-aside implementation using Redis for hot data acceleration.
 * <p>
 * Provides a generic cache-aside pattern: check Redis first, fall back to a DB supplier
 * on cache miss, and populate Redis on successful retrieval. Convenience methods are
 * provided for job listing cache (300s TTL) and leaderboard cache (60s TTL).
 * <p>
 * Uses {@link StringRedisTemplate} with JSON serialization via {@link ObjectMapper}.
 * Pattern-based invalidation uses Redis SCAN to avoid blocking the server.
 */
@Service
public class RedisCacheService {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheService.class);

    private static final Duration JOB_LISTING_TTL = Duration.ofSeconds(300);
    private static final Duration LEADERBOARD_TTL = Duration.ofSeconds(60);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public RedisCacheService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Retrieves a value from cache by key.
     *
     * @param key  the cache key
     * @param type the class of the cached value
     * @param <T>  the value type
     * @return an Optional containing the cached value, or empty on cache miss or deserialization error
     */
    public <T> Optional<T> get(String key, Class<T> type) {
        String json = redisTemplate.opsForValue().get(key);
        if (json == null) {
            return Optional.empty();
        }
        try {
            T value = objectMapper.readValue(json, type);
            return Optional.of(value);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to deserialize cached value for key {}: {}", key, ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Stores a value in cache with the specified TTL.
     *
     * @param key   the cache key
     * @param value the value to cache
     * @param ttl   the time-to-live duration
     * @param <T>   the value type
     */
    public <T> void put(String key, T value, Duration ttl) {
        try {
            String json = objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json, ttl);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize value for cache key {}: {}", key, ex.getMessage());
        }
    }

    /**
     * Invalidates a single cache entry.
     *
     * @param key the cache key to invalidate
     */
    public void invalidate(String key) {
        Boolean deleted = redisTemplate.delete(key);
        if (Boolean.TRUE.equals(deleted)) {
            log.debug("Invalidated cache key: {}", key);
        }
    }

    /**
     * Invalidates all cache entries matching the given glob pattern.
     * Uses Redis SCAN to avoid blocking the server with a KEYS command.
     *
     * @param pattern the glob pattern (e.g., "cache:jobs:*")
     */
    public void invalidatePattern(String pattern) {
        ScanOptions scanOptions = ScanOptions.scanOptions().match(pattern).count(100).build();
        long deletedCount = 0;
        try (Cursor<String> cursor = redisTemplate.scan(scanOptions)) {
            while (cursor.hasNext()) {
                String key = cursor.next();
                redisTemplate.delete(key);
                deletedCount++;
            }
        }
        if (deletedCount > 0) {
            log.debug("Invalidated {} cache keys matching pattern: {}", deletedCount, pattern);
        }
    }

    /**
     * Generic cache-aside method: checks Redis first, falls back to the DB supplier on miss,
     * and populates Redis on successful retrieval.
     *
     * @param key        the cache key
     * @param ttl        the time-to-live for the cached entry
     * @param type       the class of the cached value
     * @param dbFallback a supplier that queries the database on cache miss
     * @param <T>        the value type
     * @return an Optional containing the value (from cache or DB), or empty if not found
     */
    public <T> Optional<T> getOrLoad(String key, Duration ttl, Class<T> type, Supplier<Optional<T>> dbFallback) {
        Optional<T> cached = get(key, type);
        if (cached.isPresent()) {
            log.debug("Cache hit for key: {}", key);
            return cached;
        }

        log.debug("Cache miss for key: {}, querying database", key);
        Optional<T> dbResult = dbFallback.get();
        dbResult.ifPresent(value -> put(key, value, ttl));
        return dbResult;
    }

    /**
     * Cache-aside convenience method for job listing data (TTL 300s).
     *
     * @param key        the cache key (e.g., "cache:jobs:list:{hash}" or "cache:job:{jobId}")
     * @param type       the class of the cached value
     * @param dbFallback a supplier that queries the database on cache miss
     * @param <T>        the value type
     * @return an Optional containing the value (from cache or DB), or empty if not found
     */
    public <T> Optional<T> getJobListing(String key, Class<T> type, Supplier<Optional<T>> dbFallback) {
        return getOrLoad(key, JOB_LISTING_TTL, type, dbFallback);
    }

    /**
     * Cache-aside convenience method for leaderboard data (TTL 60s).
     *
     * @param key        the cache key (e.g., "cache:leaderboard:{assessmentId}")
     * @param type       the class of the cached value
     * @param dbFallback a supplier that queries the database on cache miss
     * @param <T>        the value type
     * @return an Optional containing the value (from cache or DB), or empty if not found
     */
    public <T> Optional<T> getLeaderboard(String key, Class<T> type, Supplier<Optional<T>> dbFallback) {
        return getOrLoad(key, LEADERBOARD_TTL, type, dbFallback);
    }
}
