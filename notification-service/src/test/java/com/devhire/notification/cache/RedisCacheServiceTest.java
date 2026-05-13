package com.devhire.notification.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class RedisCacheServiceTest {

    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOperations;
    private ObjectMapper objectMapper;
    private RedisCacheService cacheService;

    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        valueOperations = mock(ValueOperations.class);
        objectMapper = new ObjectMapper();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        cacheService = new RedisCacheService(redisTemplate, objectMapper);
    }

    @Test
    void getReturnsCachedValueOnHit() throws JsonProcessingException {
        String key = "cache:job:123";
        TestData expected = new TestData("Senior Java Dev", 150000);
        when(valueOperations.get(key)).thenReturn(objectMapper.writeValueAsString(expected));

        Optional<TestData> result = cacheService.get(key, TestData.class);

        assertThat(result).isPresent();
        assertThat(result.get().title()).isEqualTo("Senior Java Dev");
        assertThat(result.get().salary()).isEqualTo(150000);
    }

    @Test
    void getReturnsEmptyOnCacheMiss() {
        when(valueOperations.get("cache:job:999")).thenReturn(null);

        Optional<TestData> result = cacheService.get("cache:job:999", TestData.class);

        assertThat(result).isEmpty();
    }

    @Test
    void getReturnsEmptyOnDeserializationError() {
        when(valueOperations.get("cache:job:bad")).thenReturn("not-valid-json{{{");

        Optional<TestData> result = cacheService.get("cache:job:bad", TestData.class);

        assertThat(result).isEmpty();
    }

    @Test
    void putSerializesAndStoresWithTtl() throws JsonProcessingException {
        String key = "cache:job:456";
        TestData data = new TestData("Backend Engineer", 120000);
        Duration ttl = Duration.ofSeconds(300);

        cacheService.put(key, data, ttl);

        verify(valueOperations).set(eq(key), eq(objectMapper.writeValueAsString(data)), eq(ttl));
    }

    @Test
    void invalidateDeletesKey() {
        when(redisTemplate.delete("cache:job:123")).thenReturn(true);

        cacheService.invalidate("cache:job:123");

        verify(redisTemplate).delete("cache:job:123");
    }

    @Test
    void invalidatePatternUsesScanAndDeletesMatchingKeys() {
        @SuppressWarnings("unchecked")
        Cursor<String> cursor = mock(Cursor.class);
        when(cursor.hasNext()).thenReturn(true, true, false);
        when(cursor.next()).thenReturn("cache:jobs:list:abc", "cache:jobs:list:def");
        when(redisTemplate.scan(any(ScanOptions.class))).thenReturn(cursor);

        cacheService.invalidatePattern("cache:jobs:*");

        verify(redisTemplate).delete("cache:jobs:list:abc");
        verify(redisTemplate).delete("cache:jobs:list:def");
    }

    @Test
    void getOrLoadReturnsCachedValueWithoutCallingFallback() throws JsonProcessingException {
        String key = "cache:leaderboard:assess-1";
        TestData cached = new TestData("Leaderboard", 100);
        when(valueOperations.get(key)).thenReturn(objectMapper.writeValueAsString(cached));
        AtomicInteger fallbackCalls = new AtomicInteger(0);

        Optional<TestData> result = cacheService.getOrLoad(key, Duration.ofSeconds(60), TestData.class,
                () -> { fallbackCalls.incrementAndGet(); return Optional.of(new TestData("FromDB", 200)); });

        assertThat(result).isPresent();
        assertThat(result.get().title()).isEqualTo("Leaderboard");
        assertThat(fallbackCalls.get()).isZero();
    }

    @Test
    void getOrLoadCallsFallbackOnMissAndPopulatesCache() throws JsonProcessingException {
        String key = "cache:job:new";
        TestData dbData = new TestData("New Job", 90000);
        when(valueOperations.get(key)).thenReturn(null);

        Optional<TestData> result = cacheService.getOrLoad(key, Duration.ofSeconds(300), TestData.class,
                () -> Optional.of(dbData));

        assertThat(result).isPresent();
        assertThat(result.get().title()).isEqualTo("New Job");
        verify(valueOperations).set(eq(key), eq(objectMapper.writeValueAsString(dbData)), eq(Duration.ofSeconds(300)));
    }

    @Test
    void getOrLoadReturnsEmptyWhenFallbackReturnsEmpty() {
        when(valueOperations.get("cache:job:missing")).thenReturn(null);

        Optional<TestData> result = cacheService.getOrLoad("cache:job:missing", Duration.ofSeconds(300), TestData.class,
                Optional::empty);

        assertThat(result).isEmpty();
        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void getJobListingUsesJobTtl() throws JsonProcessingException {
        String key = "cache:jobs:list:hash1";
        TestData dbData = new TestData("Job Listing", 80000);
        when(valueOperations.get(key)).thenReturn(null);

        cacheService.getJobListing(key, TestData.class, () -> Optional.of(dbData));

        verify(valueOperations).set(eq(key), eq(objectMapper.writeValueAsString(dbData)), eq(Duration.ofSeconds(300)));
    }

    @Test
    void getLeaderboardUsesLeaderboardTtl() throws JsonProcessingException {
        String key = "cache:leaderboard:assess-2";
        TestData dbData = new TestData("Leaderboard Data", 50);
        when(valueOperations.get(key)).thenReturn(null);

        cacheService.getLeaderboard(key, TestData.class, () -> Optional.of(dbData));

        verify(valueOperations).set(eq(key), eq(objectMapper.writeValueAsString(dbData)), eq(Duration.ofSeconds(60)));
    }

    /**
     * Simple record used as test data for serialization/deserialization.
     */
    record TestData(String title, int salary) {}
}
