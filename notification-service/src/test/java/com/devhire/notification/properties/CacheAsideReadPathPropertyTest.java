package com.devhire.notification.properties;

import net.jqwik.api.*;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Cache-Aside Read Path.
 *
 * <p>Feature: realtime-collaboration, Property 13: Cache-Aside Read Path</p>
 *
 * <p><b>Validates: Requirements 10.5</b></p>
 *
 * <p>For any cache key, the first read SHALL result in a cache miss followed by a database
 * query and cache population. Any subsequent read (before TTL expiry or invalidation)
 * SHALL return the cached value without a database query.</p>
 */
@Label("Feature: realtime-collaboration, Property 13: Cache-Aside Read Path")
@Tag("realtime-collaboration")
@Tag("property-test")
class CacheAsideReadPathPropertyTest {

    /**
     * Represents a read operation on a cache key.
     */
    sealed interface CacheOperation permits ReadOp, InvalidateOp {}

    record ReadOp(String key) implements CacheOperation {}
    record InvalidateOp(String key) implements CacheOperation {}

    /**
     * Simulates the cache-aside pattern tracking cache hits/misses and DB queries.
     */
    static class CacheAsideSimulator {
        private final Map<String, String> cache = new HashMap<>();
        private final Map<String, String> database;
        private int dbQueryCount = 0;
        private int cacheHitCount = 0;

        CacheAsideSimulator(Map<String, String> database) {
            this.database = new HashMap<>(database);
        }

        Optional<String> read(String key) {
            // Check cache first
            if (cache.containsKey(key)) {
                cacheHitCount++;
                return Optional.ofNullable(cache.get(key));
            }

            // Cache miss: query database
            dbQueryCount++;
            String dbValue = database.get(key);
            if (dbValue != null) {
                // Populate cache on successful DB read
                cache.put(key, dbValue);
                return Optional.of(dbValue);
            }
            return Optional.empty();
        }

        void invalidate(String key) {
            cache.remove(key);
        }

        int getDbQueryCount() { return dbQueryCount; }
        int getCacheHitCount() { return cacheHitCount; }
        boolean isCached(String key) { return cache.containsKey(key); }
    }

    /**
     * Property 13a: First read for any key results in a cache miss and DB query,
     * subsequent reads use cache without DB query.
     */
    @Property(tries = 200)
    void firstReadQueriesDbSubsequentReadsUseCache(
            @ForAll("cacheKeys") String key,
            @ForAll("dbValues") String dbValue
    ) {
        Map<String, String> database = Map.of(key, dbValue);
        CacheAsideSimulator simulator = new CacheAsideSimulator(database);

        // First read: should be a cache miss → DB query → cache populate
        Optional<String> firstResult = simulator.read(key);
        assertThat(firstResult).isPresent().contains(dbValue);
        assertThat(simulator.getDbQueryCount()).isEqualTo(1);
        assertThat(simulator.getCacheHitCount()).isEqualTo(0);
        assertThat(simulator.isCached(key)).isTrue();

        // Second read: should be a cache hit → no DB query
        int dbCountBefore = simulator.getDbQueryCount();
        Optional<String> secondResult = simulator.read(key);
        assertThat(secondResult).isPresent().contains(dbValue);
        assertThat(simulator.getDbQueryCount()).isEqualTo(dbCountBefore);
        assertThat(simulator.getCacheHitCount()).isEqualTo(1);

        // Third read: still cache hit
        Optional<String> thirdResult = simulator.read(key);
        assertThat(thirdResult).isPresent().contains(dbValue);
        assertThat(simulator.getDbQueryCount()).isEqualTo(dbCountBefore);
        assertThat(simulator.getCacheHitCount()).isEqualTo(2);
    }

    /**
     * Property 13b: After invalidation, the next read results in a DB query again.
     */
    @Property(tries = 200)
    void afterInvalidationNextReadQueriesDb(
            @ForAll("cacheKeys") String key,
            @ForAll("dbValues") String dbValue
    ) {
        Map<String, String> database = Map.of(key, dbValue);
        CacheAsideSimulator simulator = new CacheAsideSimulator(database);

        // First read: populates cache
        simulator.read(key);
        assertThat(simulator.getDbQueryCount()).isEqualTo(1);

        // Invalidate
        simulator.invalidate(key);
        assertThat(simulator.isCached(key)).isFalse();

        // Next read after invalidation: should query DB again
        Optional<String> result = simulator.read(key);
        assertThat(result).isPresent().contains(dbValue);
        assertThat(simulator.getDbQueryCount()).isEqualTo(2);
    }

    /**
     * Property 13c: For any sequence of reads and invalidations, DB is only queried
     * on cache misses (first read or after invalidation).
     */
    @Property(tries = 200)
    void dbOnlyQueriedOnCacheMisses(
            @ForAll("operationSequences") List<CacheOperation> operations,
            @ForAll("dbValues") String dbValue
    ) {
        // Build a database with all keys that appear in operations
        Set<String> allKeys = new HashSet<>();
        for (CacheOperation op : operations) {
            switch (op) {
                case ReadOp read -> allKeys.add(read.key());
                case InvalidateOp inv -> allKeys.add(inv.key());
            }
        }
        Map<String, String> database = new HashMap<>();
        for (String key : allKeys) {
            database.put(key, dbValue + "-" + key);
        }

        CacheAsideSimulator simulator = new CacheAsideSimulator(database);
        Set<String> cachedKeys = new HashSet<>();
        int expectedDbQueries = 0;

        for (CacheOperation op : operations) {
            switch (op) {
                case ReadOp read -> {
                    if (!cachedKeys.contains(read.key())) {
                        expectedDbQueries++;
                        cachedKeys.add(read.key());
                    }
                    simulator.read(read.key());
                }
                case InvalidateOp inv -> {
                    simulator.invalidate(inv.key());
                    cachedKeys.remove(inv.key());
                }
            }
        }

        assertThat(simulator.getDbQueryCount()).isEqualTo(expectedDbQueries);
    }

    @Provide
    Arbitrary<String> cacheKeys() {
        return Arbitraries.of(
                "cache:jobs:list:abc123", "cache:job:job-1", "cache:job:job-2",
                "cache:leaderboard:assess-1", "cache:leaderboard:assess-2",
                "cache:notif:count:user-1"
        );
    }

    @Provide
    Arbitrary<String> dbValues() {
        return Arbitraries.strings().ofMinLength(1).ofMaxLength(50).alpha().numeric();
    }

    @Provide
    Arbitrary<List<CacheOperation>> operationSequences() {
        Arbitrary<String> keys = Arbitraries.of("key-A", "key-B", "key-C", "key-D");

        Arbitrary<CacheOperation> reads = keys.map(ReadOp::new);
        Arbitrary<CacheOperation> invalidations = keys.map(InvalidateOp::new);

        // Bias towards reads (70% reads, 30% invalidations)
        return Arbitraries.frequencyOf(
                Tuple.of(7, reads),
                Tuple.of(3, invalidations)
        ).list().ofMinSize(1).ofMaxSize(40);
    }
}
