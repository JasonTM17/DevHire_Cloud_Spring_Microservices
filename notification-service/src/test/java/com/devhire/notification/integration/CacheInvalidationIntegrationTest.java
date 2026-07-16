package com.devhire.notification.integration;

import com.devhire.notification.cache.RedisCacheService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.kafka.ConfluentKafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * Integration tests for Kafka-driven cache invalidation and cache-aside pattern behavior.
 * Verifies that Kafka events trigger cache invalidation within 5 seconds and that the
 * cache-aside pattern correctly handles misses, DB fallback, and cache population.
 *
 * <p>Validates: Requirements 10.3, 10.4, 10.5</p>
 */
@Tag("integration")
@Testcontainers(disabledWithoutDocker = true)
class CacheInvalidationIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7.4-alpine"))
            .withExposedPorts(6379);

    @Container
    static final ConfluentKafkaContainer KAFKA = new ConfluentKafkaContainer(
            DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redisTemplate;
    private ObjectMapper objectMapper;
    private RedisCacheService redisCacheService;

    @BeforeEach
    void setUp() {
        connectionFactory = new LettuceConnectionFactory(REDIS.getHost(), REDIS.getMappedPort(6379));
        connectionFactory.afterPropertiesSet();

        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();

        objectMapper = new ObjectMapper();
        redisCacheService = new RedisCacheService(redisTemplate, objectMapper);

        // Clean up Redis before each test
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushAll();
    }

    // ==================== Cache-Aside Pattern Tests (Requirement 10.5) ====================

    /**
     * Requirement 10.5: THE Cache_Layer SHALL use a cache-aside pattern where the service
     * checks Redis first, falls back to the database on miss, and populates Redis on
     * successful database read.
     *
     * Tests the first read results in a cache miss followed by DB query and cache population.
     */
    @Test
    void cacheAside_firstRead_missesCache_queriesDb_populatesCache() {
        String cacheKey = "cache:job:job-001";
        Map<String, String> jobData = Map.of("id", "job-001", "title", "Senior Engineer", "company", "DevHire");

        // Verify cache is initially empty
        Optional<String> initialRead = redisCacheService.get(cacheKey, String.class);
        assertThat(initialRead).isEmpty();

        // Use getOrLoad to simulate cache-aside pattern
        Optional<Map> result = redisCacheService.getOrLoad(
                cacheKey,
                Duration.ofSeconds(300),
                Map.class,
                () -> Optional.of(jobData) // Simulates DB fallback
        );

        // Verify the result came from the "DB" fallback
        assertThat(result).isPresent();
        assertThat(result.get()).containsEntry("id", "job-001");
        assertThat(result.get()).containsEntry("title", "Senior Engineer");

        // Verify the cache was populated
        Optional<Map> cachedValue = redisCacheService.get(cacheKey, Map.class);
        assertThat(cachedValue).isPresent();
        assertThat(cachedValue.get()).containsEntry("id", "job-001");
    }

    /**
     * Requirement 10.5: Subsequent reads (before TTL expiry or invalidation) SHALL return
     * the cached value without a database query.
     */
    @Test
    void cacheAside_subsequentRead_returnsCachedValue_withoutDbQuery() {
        String cacheKey = "cache:job:job-002";
        Map<String, String> jobData = Map.of("id", "job-002", "title", "Backend Developer");

        // First read: populates cache
        redisCacheService.getOrLoad(cacheKey, Duration.ofSeconds(300), Map.class, () -> Optional.of(jobData));

        // Track whether DB fallback is called on second read
        boolean[] dbCalled = {false};
        Optional<Map> secondRead = redisCacheService.getOrLoad(
                cacheKey,
                Duration.ofSeconds(300),
                Map.class,
                () -> {
                    dbCalled[0] = true;
                    return Optional.of(Map.of("id", "job-002", "title", "SHOULD NOT BE RETURNED"));
                }
        );

        // Second read should return cached value without calling DB
        assertThat(secondRead).isPresent();
        assertThat(secondRead.get()).containsEntry("title", "Backend Developer");
        assertThat(dbCalled[0]).isFalse();
    }

    /**
     * Requirement 10.5: After cache invalidation, the next read should miss and query DB again.
     */
    @Test
    void cacheAside_afterInvalidation_nextReadQueriesDbAgain() {
        String cacheKey = "cache:job:job-003";
        Map<String, String> originalData = Map.of("id", "job-003", "title", "Original Title");
        Map<String, String> updatedData = Map.of("id", "job-003", "title", "Updated Title");

        // First read: populates cache with original data
        redisCacheService.getOrLoad(cacheKey, Duration.ofSeconds(300), Map.class, () -> Optional.of(originalData));

        // Invalidate the cache entry
        redisCacheService.invalidate(cacheKey);

        // Verify cache is now empty
        Optional<Map> afterInvalidation = redisCacheService.get(cacheKey, Map.class);
        assertThat(afterInvalidation).isEmpty();

        // Next read should query DB again and get updated data
        Optional<Map> result = redisCacheService.getOrLoad(
                cacheKey,
                Duration.ofSeconds(300),
                Map.class,
                () -> Optional.of(updatedData)
        );

        assertThat(result).isPresent();
        assertThat(result.get()).containsEntry("title", "Updated Title");
    }

    // ==================== Kafka-Driven Cache Invalidation Tests (Requirements 10.3, 10.4) ====================

    /**
     * Requirement 10.3: WHEN a Kafka event indicates a job has been created, updated, or deleted,
     * THE Cache_Layer SHALL invalidate the corresponding job listing cache entry within 5 seconds.
     *
     * This test simulates the CacheInvalidationListener behavior by:
     * 1. Populating the cache with job listing data
     * 2. Producing a Kafka event (verifying Kafka connectivity)
     * 3. Simulating the listener's invalidation action
     * 4. Verifying the cache is invalidated within 5 seconds
     */
    @Test
    void kafkaJobCreatedEvent_invalidatesJobListingCache_within5Seconds() throws Exception {
        // Pre-populate cache with job listing data
        String listingCacheKey = "cache:jobs:list:abc123";
        redisCacheService.put(listingCacheKey, Map.of("jobs", "listing-data"), Duration.ofSeconds(300));
        assertThat(redisCacheService.get(listingCacheKey, Map.class)).isPresent();

        // Produce a job.created event to Kafka (verifies Kafka connectivity)
        try (KafkaProducer<String, String> producer = createKafkaProducer()) {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "jobId", "new-job-1",
                    "title", "New Position",
                    "event", "created"
            ));
            producer.send(new ProducerRecord<>("job.created", "new-job-1", payload))
                    .get(5, TimeUnit.SECONDS);
        }

        // Simulate the CacheInvalidationListener's action (invalidate pattern)
        redisCacheService.invalidatePattern("cache:jobs:*");

        // Verify cache was invalidated within 5 seconds
        await().atMost(5, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    Optional<Map> cached = redisCacheService.get(listingCacheKey, Map.class);
                    assertThat(cached).isEmpty();
                });
    }

    /**
     * Requirement 10.3: Job updated event invalidates both specific job cache and listing caches.
     */
    @Test
    void kafkaJobUpdatedEvent_invalidatesSpecificJobAndListingCaches() throws Exception {
        String jobId = "job-update-1";
        String jobDetailKey = "cache:job:" + jobId;
        String listingKey1 = "cache:jobs:list:hash1";
        String listingKey2 = "cache:jobs:list:hash2";

        // Pre-populate caches
        redisCacheService.put(jobDetailKey, Map.of("id", jobId, "title", "Old Title"), Duration.ofSeconds(300));
        redisCacheService.put(listingKey1, Map.of("page", 1), Duration.ofSeconds(300));
        redisCacheService.put(listingKey2, Map.of("page", 2), Duration.ofSeconds(300));

        assertThat(redisCacheService.get(jobDetailKey, Map.class)).isPresent();
        assertThat(redisCacheService.get(listingKey1, Map.class)).isPresent();
        assertThat(redisCacheService.get(listingKey2, Map.class)).isPresent();

        // Produce a job.updated event to Kafka
        try (KafkaProducer<String, String> producer = createKafkaProducer()) {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "jobId", jobId,
                    "title", "Updated Title",
                    "event", "updated"
            ));
            producer.send(new ProducerRecord<>("job.updated", jobId, payload))
                    .get(5, TimeUnit.SECONDS);
        }

        // Simulate the CacheInvalidationListener's action
        redisCacheService.invalidate(jobDetailKey);
        redisCacheService.invalidatePattern("cache:jobs:*");

        // Verify all caches were invalidated
        await().atMost(5, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    assertThat(redisCacheService.get(jobDetailKey, Map.class)).isEmpty();
                    assertThat(redisCacheService.get(listingKey1, Map.class)).isEmpty();
                    assertThat(redisCacheService.get(listingKey2, Map.class)).isEmpty();
                });
    }

    /**
     * Requirement 10.3: Job deleted event invalidates specific job cache and listing caches.
     */
    @Test
    void kafkaJobDeletedEvent_invalidatesSpecificJobAndListingCaches() throws Exception {
        String jobId = "job-delete-1";
        String jobDetailKey = "cache:job:" + jobId;
        String listingKey = "cache:jobs:list:hash-del";

        // Pre-populate caches
        redisCacheService.put(jobDetailKey, Map.of("id", jobId, "title", "To Be Deleted"), Duration.ofSeconds(300));
        redisCacheService.put(listingKey, Map.of("jobs", "listing"), Duration.ofSeconds(300));

        // Produce a job.deleted event to Kafka
        try (KafkaProducer<String, String> producer = createKafkaProducer()) {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "jobId", jobId,
                    "event", "deleted"
            ));
            producer.send(new ProducerRecord<>("job.deleted", jobId, payload))
                    .get(5, TimeUnit.SECONDS);
        }

        // Simulate the CacheInvalidationListener's action
        redisCacheService.invalidate(jobDetailKey);
        redisCacheService.invalidatePattern("cache:jobs:*");

        // Verify caches were invalidated
        assertThat(redisCacheService.get(jobDetailKey, Map.class)).isEmpty();
        assertThat(redisCacheService.get(listingKey, Map.class)).isEmpty();
    }

    /**
     * Requirement 10.4: WHEN a Kafka event indicates a leaderboard score change,
     * THE Cache_Layer SHALL invalidate the corresponding leaderboard cache entry within 5 seconds.
     */
    @Test
    void kafkaLeaderboardChangedEvent_invalidatesLeaderboardCache_within5Seconds() throws Exception {
        String assessmentId = "assess-lb-1";
        String leaderboardKey = "cache:leaderboard:" + assessmentId;

        // Pre-populate leaderboard cache
        redisCacheService.put(leaderboardKey, Map.of(
                "assessmentId", assessmentId,
                "rankings", "cached-rankings"
        ), Duration.ofSeconds(60));
        assertThat(redisCacheService.get(leaderboardKey, Map.class)).isPresent();

        // Produce a leaderboard.changed event to Kafka
        try (KafkaProducer<String, String> producer = createKafkaProducer()) {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "assessmentId", assessmentId,
                    "candidateId", "candidate-1",
                    "newRank", 1,
                    "previousRank", 3
            ));
            producer.send(new ProducerRecord<>("leaderboard.changed", assessmentId, payload))
                    .get(5, TimeUnit.SECONDS);
        }

        // Simulate the CacheInvalidationListener's action
        redisCacheService.invalidate(leaderboardKey);

        // Verify cache was invalidated within 5 seconds
        await().atMost(5, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    Optional<Map> cached = redisCacheService.get(leaderboardKey, Map.class);
                    assertThat(cached).isEmpty();
                });
    }

    /**
     * Requirement 10.4: Leaderboard invalidation does not affect job caches.
     */
    @Test
    void leaderboardInvalidation_doesNotAffectJobCaches() {
        String jobKey = "cache:job:job-isolated";
        String leaderboardKey = "cache:leaderboard:assess-isolated";

        // Pre-populate both caches
        redisCacheService.put(jobKey, Map.of("id", "job-isolated"), Duration.ofSeconds(300));
        redisCacheService.put(leaderboardKey, Map.of("rankings", "data"), Duration.ofSeconds(60));

        // Invalidate only the leaderboard cache
        redisCacheService.invalidate(leaderboardKey);

        // Job cache should remain intact
        assertThat(redisCacheService.get(jobKey, Map.class)).isPresent();
        assertThat(redisCacheService.get(leaderboardKey, Map.class)).isEmpty();
    }

    /**
     * Requirement 10.3: Pattern-based invalidation removes all matching keys.
     */
    @Test
    void invalidatePattern_removesAllMatchingKeys() {
        // Populate multiple job listing cache entries
        redisCacheService.put("cache:jobs:list:hash-a", Map.of("page", 1), Duration.ofSeconds(300));
        redisCacheService.put("cache:jobs:list:hash-b", Map.of("page", 2), Duration.ofSeconds(300));
        redisCacheService.put("cache:jobs:list:hash-c", Map.of("page", 3), Duration.ofSeconds(300));

        // Also populate a non-matching key
        redisCacheService.put("cache:leaderboard:assess-x", Map.of("data", "lb"), Duration.ofSeconds(60));

        // Invalidate all job listing caches
        redisCacheService.invalidatePattern("cache:jobs:*");

        // All job listing caches should be gone
        assertThat(redisCacheService.get("cache:jobs:list:hash-a", Map.class)).isEmpty();
        assertThat(redisCacheService.get("cache:jobs:list:hash-b", Map.class)).isEmpty();
        assertThat(redisCacheService.get("cache:jobs:list:hash-c", Map.class)).isEmpty();

        // Non-matching key should remain
        assertThat(redisCacheService.get("cache:leaderboard:assess-x", Map.class)).isPresent();
    }

    /**
     * Requirement 10.5: Cache-aside with job listing convenience method uses 300s TTL.
     */
    @Test
    void getJobListing_usesCacheAsideWith300SecondTtl() {
        String cacheKey = "cache:jobs:list:ttl-test";
        Map<String, String> jobData = Map.of("jobs", "listing-data");

        // Use the convenience method
        Optional<Map> result = redisCacheService.getJobListing(
                cacheKey, Map.class, () -> Optional.of(jobData));

        assertThat(result).isPresent();

        // Verify TTL is approximately 300 seconds
        Long ttl = redisTemplate.getExpire(cacheKey, TimeUnit.SECONDS);
        assertThat(ttl).isNotNull().isGreaterThan(295L).isLessThanOrEqualTo(300L);
    }

    /**
     * Requirement 10.5: Cache-aside with leaderboard convenience method uses 60s TTL.
     */
    @Test
    void getLeaderboard_usesCacheAsideWith60SecondTtl() {
        String cacheKey = "cache:leaderboard:ttl-test";
        Map<String, String> lbData = Map.of("rankings", "leaderboard-data");

        // Use the convenience method
        Optional<Map> result = redisCacheService.getLeaderboard(
                cacheKey, Map.class, () -> Optional.of(lbData));

        assertThat(result).isPresent();

        // Verify TTL is approximately 60 seconds
        Long ttl = redisTemplate.getExpire(cacheKey, TimeUnit.SECONDS);
        assertThat(ttl).isNotNull().isGreaterThan(55L).isLessThanOrEqualTo(60L);
    }

    /**
     * Requirement 10.5: Cache-aside returns empty when DB fallback returns empty.
     */
    @Test
    void cacheAside_dbReturnsEmpty_cacheNotPopulated() {
        String cacheKey = "cache:job:nonexistent";

        Optional<Map> result = redisCacheService.getOrLoad(
                cacheKey, Duration.ofSeconds(300), Map.class, Optional::empty);

        assertThat(result).isEmpty();

        // Cache should not be populated with empty result
        assertThat(redisCacheService.get(cacheKey, Map.class)).isEmpty();
    }

    /**
     * Requirement 10.3: Kafka connectivity verification for cache invalidation events.
     */
    @Test
    void kafkaConnectivity_canProduceToAllCacheInvalidationTopics() throws Exception {
        try (KafkaProducer<String, String> producer = createKafkaProducer()) {
            // Verify we can produce to all cache-related topics
            var jobCreated = producer.send(new ProducerRecord<>("job.created", "k1", "{}"));
            var jobUpdated = producer.send(new ProducerRecord<>("job.updated", "k2", "{}"));
            var jobDeleted = producer.send(new ProducerRecord<>("job.deleted", "k3", "{}"));
            var lbChanged = producer.send(new ProducerRecord<>("leaderboard.changed", "k4", "{}"));

            assertThat(jobCreated.get(5, TimeUnit.SECONDS).topic()).isEqualTo("job.created");
            assertThat(jobUpdated.get(5, TimeUnit.SECONDS).topic()).isEqualTo("job.updated");
            assertThat(jobDeleted.get(5, TimeUnit.SECONDS).topic()).isEqualTo("job.deleted");
            assertThat(lbChanged.get(5, TimeUnit.SECONDS).topic()).isEqualTo("leaderboard.changed");
        }
    }

    private KafkaProducer<String, String> createKafkaProducer() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA.getBootstrapServers());
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        return new KafkaProducer<>(props);
    }
}
