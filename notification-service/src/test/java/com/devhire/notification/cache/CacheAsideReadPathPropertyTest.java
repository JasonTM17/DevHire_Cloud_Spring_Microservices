package com.devhire.notification.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import net.jqwik.api.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Property 13: Cache-Aside Read Path
 * <p>
 * For any cache key, the first read SHALL result in a cache miss followed by a database query
 * and cache population. Any subsequent read (before TTL expiry or invalidation) SHALL return
 * the cached value without a database query.
 * <p>
 * <b>Validates: Requirements 10.5</b>
 * <p>
 * Feature: realtime-collaboration, Property 13: Cache-Aside Read Path
 */
@Tag("realtime-collaboration")
@Tag("Property-13-Cache-Aside-Read-Path")
class CacheAsideReadPathPropertyTest {

    /**
     * Property 13: First read results in cache miss, DB query, and cache population.
     * Subsequent reads return cached value without DB query.
     * <p>
     * <b>Validates: Requirements 10.5</b>
     */
    @Property(tries = 150)
    void firstReadQueriesDbAndPopulatesCache_subsequentReadsUseCache(
            @ForAll("cacheReadScenarios") CacheReadScenario scenario
    ) {
        // Setup
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        ObjectMapper objectMapper = new ObjectMapper();

        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        RedisCacheService cacheService = new RedisCacheService(redisTemplate, objectMapper);

        String key = scenario.cacheKey();
        Duration ttl = scenario.ttl();
        String dbValue = scenario.dbValue();
        String serializedValue = "\"" + dbValue + "\""; // JSON string serialization

        // Track DB calls
        AtomicInteger dbCallCount = new AtomicInteger(0);

        // First read: cache miss (returns null)
        when(valueOps.get(key)).thenReturn(null);

        Optional<String> firstResult = cacheService.getOrLoad(key, ttl, String.class, () -> {
            dbCallCount.incrementAndGet();
            return Optional.of(dbValue);
        });

        // Assert: first read returns the DB value
        assertThat(firstResult).isPresent();
        assertThat(firstResult.get()).isEqualTo(dbValue);

        // Assert: DB was queried exactly once
        assertThat(dbCallCount.get()).isEqualTo(1);

        // Assert: cache was populated
        verify(valueOps).set(eq(key), eq(serializedValue), eq(ttl));

        // Now simulate subsequent reads: cache hit (returns the cached value)
        when(valueOps.get(key)).thenReturn(serializedValue);

        // Perform multiple subsequent reads
        for (int i = 0; i < scenario.subsequentReadCount(); i++) {
            Optional<String> subsequentResult = cacheService.getOrLoad(key, ttl, String.class, () -> {
                dbCallCount.incrementAndGet();
                return Optional.of("should-not-be-called");
            });

            // Assert: subsequent reads return the cached value
            assertThat(subsequentResult).isPresent();
            assertThat(subsequentResult.get()).isEqualTo(dbValue);
        }

        // Assert: DB was still only queried once (no additional calls for subsequent reads)
        assertThat(dbCallCount.get()).isEqualTo(1);
    }

    /**
     * Property 13 (cache miss with empty DB): When the DB returns empty,
     * the cache is NOT populated, and subsequent reads still query the DB.
     * <p>
     * <b>Validates: Requirements 10.5</b>
     */
    @Property(tries = 150)
    void cacheMissWithEmptyDbDoesNotPopulateCache(
            @ForAll("cacheKeys") String cacheKey
    ) {
        // Setup
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        ObjectMapper objectMapper = new ObjectMapper();

        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(cacheKey)).thenReturn(null);

        RedisCacheService cacheService = new RedisCacheService(redisTemplate, objectMapper);

        AtomicInteger dbCallCount = new AtomicInteger(0);

        // First read: cache miss, DB returns empty
        Optional<String> result = cacheService.getOrLoad(cacheKey, Duration.ofSeconds(300), String.class, () -> {
            dbCallCount.incrementAndGet();
            return Optional.empty();
        });

        // Assert: result is empty
        assertThat(result).isEmpty();

        // Assert: DB was queried
        assertThat(dbCallCount.get()).isEqualTo(1);

        // Assert: cache was NOT populated (no set call)
        verify(valueOps, never()).set(eq(cacheKey), anyString(), any(Duration.class));
    }

    /**
     * Property 13 (invalidation resets path): After cache invalidation,
     * the next read should query the DB again and repopulate the cache.
     * <p>
     * <b>Validates: Requirements 10.5</b>
     */
    @Property(tries = 150)
    void afterInvalidationNextReadQueriesDbAgain(
            @ForAll("cacheReadScenarios") CacheReadScenario scenario
    ) {
        // Setup
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        ObjectMapper objectMapper = new ObjectMapper();

        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        RedisCacheService cacheService = new RedisCacheService(redisTemplate, objectMapper);

        String key = scenario.cacheKey();
        Duration ttl = scenario.ttl();
        String dbValue = scenario.dbValue();
        String serializedValue = "\"" + dbValue + "\"";

        AtomicInteger dbCallCount = new AtomicInteger(0);

        // Phase 1: First read - cache miss, populates cache
        when(valueOps.get(key)).thenReturn(null);
        cacheService.getOrLoad(key, ttl, String.class, () -> {
            dbCallCount.incrementAndGet();
            return Optional.of(dbValue);
        });
        assertThat(dbCallCount.get()).isEqualTo(1);

        // Phase 2: Invalidate the cache
        when(redisTemplate.delete(key)).thenReturn(true);
        cacheService.invalidate(key);
        verify(redisTemplate).delete(key);

        // Phase 3: After invalidation, cache miss again
        when(valueOps.get(key)).thenReturn(null);

        String updatedValue = dbValue + "-updated";
        String updatedSerialized = "\"" + updatedValue + "\"";

        Optional<String> postInvalidationResult = cacheService.getOrLoad(key, ttl, String.class, () -> {
            dbCallCount.incrementAndGet();
            return Optional.of(updatedValue);
        });

        // Assert: DB was queried again after invalidation
        assertThat(dbCallCount.get()).isEqualTo(2);
        assertThat(postInvalidationResult).isPresent();
        assertThat(postInvalidationResult.get()).isEqualTo(updatedValue);

        // Assert: cache was repopulated with new value
        verify(valueOps).set(eq(key), eq(updatedSerialized), eq(ttl));
    }

    @Provide
    Arbitrary<CacheReadScenario> cacheReadScenarios() {
        Arbitrary<String> keys = Arbitraries.of(
                "cache:job:", "cache:jobs:list:", "cache:leaderboard:"
        ).flatMap(prefix -> Arbitraries.strings().alpha().ofMinLength(4).ofMaxLength(10)
                .map(suffix -> prefix + suffix));

        Arbitrary<Duration> ttls = Arbitraries.of(60, 120, 300, 600)
                .map(Duration::ofSeconds);

        Arbitrary<String> dbValues = Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(20);

        Arbitrary<Integer> readCounts = Arbitraries.integers().between(1, 5);

        return Combinators.combine(keys, ttls, dbValues, readCounts)
                .as(CacheReadScenario::new);
    }

    @Provide
    Arbitrary<String> cacheKeys() {
        return Arbitraries.of(
                "cache:job:", "cache:jobs:list:", "cache:leaderboard:"
        ).flatMap(prefix -> Arbitraries.strings().alpha().ofMinLength(4).ofMaxLength(10)
                .map(suffix -> prefix + suffix));
    }

    record CacheReadScenario(
            String cacheKey,
            Duration ttl,
            String dbValue,
            int subsequentReadCount
    ) {}
}
