package com.devhire.notification.event;

import com.devhire.notification.cache.RedisCacheService;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

class CacheInvalidationListenerTest {

    private final RedisCacheService redisCacheService = mock(RedisCacheService.class);
    private final CacheInvalidationListener listener = new CacheInvalidationListener(redisCacheService);

    // --- job.created tests ---

    @Test
    void onJobCreatedInvalidatesJobListingPattern() {
        Map<String, Object> event = Map.of(
                "jobId", UUID.randomUUID().toString(),
                "title", "Senior Java Developer"
        );

        listener.onJobCreated(event);

        verify(redisCacheService).invalidatePattern("cache:jobs:*");
    }

    @Test
    void onJobCreatedHandlesConsumerRecordWrapper() {
        Map<String, Object> payload = Map.of(
                "jobId", UUID.randomUUID().toString(),
                "title", "Backend Engineer"
        );
        ConsumerRecord<String, Object> record = new ConsumerRecord<>("job.created", 0, 1L, "key", payload);

        listener.onJobCreated(record);

        verify(redisCacheService).invalidatePattern("cache:jobs:*");
    }

    // --- job.updated tests ---

    @Test
    void onJobUpdatedInvalidatesSpecificJobAndListingPattern() {
        String jobId = UUID.randomUUID().toString();
        Map<String, Object> event = Map.of(
                "jobId", jobId,
                "title", "Updated Title"
        );

        listener.onJobUpdated(event);

        verify(redisCacheService).invalidate("cache:job:" + jobId);
        verify(redisCacheService).invalidatePattern("cache:jobs:*");
    }

    @Test
    void onJobUpdatedInvalidatesListingEvenWithoutJobId() {
        Map<String, Object> event = Map.of("title", "Some Title");

        listener.onJobUpdated(event);

        verify(redisCacheService).invalidatePattern("cache:jobs:*");
        verifyNoMoreInteractions(redisCacheService);
    }

    @Test
    void onJobUpdatedHandlesConsumerRecordWrapper() {
        String jobId = UUID.randomUUID().toString();
        Map<String, Object> payload = Map.of("jobId", jobId);
        ConsumerRecord<String, Object> record = new ConsumerRecord<>("job.updated", 0, 1L, "key", payload);

        listener.onJobUpdated(record);

        verify(redisCacheService).invalidate("cache:job:" + jobId);
        verify(redisCacheService).invalidatePattern("cache:jobs:*");
    }

    // --- job.deleted tests ---

    @Test
    void onJobDeletedInvalidatesSpecificJobAndListingPattern() {
        String jobId = UUID.randomUUID().toString();
        Map<String, Object> event = Map.of("jobId", jobId);

        listener.onJobDeleted(event);

        verify(redisCacheService).invalidate("cache:job:" + jobId);
        verify(redisCacheService).invalidatePattern("cache:jobs:*");
    }

    @Test
    void onJobDeletedInvalidatesListingEvenWithoutJobId() {
        Map<String, Object> event = Map.of("reason", "expired");

        listener.onJobDeleted(event);

        verify(redisCacheService).invalidatePattern("cache:jobs:*");
        verifyNoMoreInteractions(redisCacheService);
    }

    @Test
    void onJobDeletedHandlesConsumerRecordWrapper() {
        String jobId = UUID.randomUUID().toString();
        Map<String, Object> payload = Map.of("jobId", jobId);
        ConsumerRecord<String, Object> record = new ConsumerRecord<>("job.deleted", 0, 1L, "key", payload);

        listener.onJobDeleted(record);

        verify(redisCacheService).invalidate("cache:job:" + jobId);
        verify(redisCacheService).invalidatePattern("cache:jobs:*");
    }

    // --- leaderboard.changed tests ---

    @Test
    void onLeaderboardChangedInvalidatesSpecificLeaderboardCache() {
        String assessmentId = UUID.randomUUID().toString();
        Map<String, Object> event = Map.of(
                "assessmentId", assessmentId,
                "candidateId", UUID.randomUUID().toString()
        );

        listener.onLeaderboardChanged(event);

        verify(redisCacheService).invalidate("cache:leaderboard:" + assessmentId);
    }

    @Test
    void onLeaderboardChangedInvalidatesAllLeaderboardsWhenNoAssessmentId() {
        Map<String, Object> event = Map.of("candidateId", UUID.randomUUID().toString());

        listener.onLeaderboardChanged(event);

        verify(redisCacheService).invalidatePattern("cache:leaderboard:*");
    }

    @Test
    void onLeaderboardChangedHandlesConsumerRecordWrapper() {
        String assessmentId = UUID.randomUUID().toString();
        Map<String, Object> payload = Map.of("assessmentId", assessmentId);
        ConsumerRecord<String, Object> record = new ConsumerRecord<>("leaderboard.changed", 0, 1L, "key", payload);

        listener.onLeaderboardChanged(record);

        verify(redisCacheService).invalidate("cache:leaderboard:" + assessmentId);
    }

    // --- error handling tests ---

    @Test
    void onJobCreatedDoesNotThrowOnRedisFailure() {
        RedisCacheService failingCache = mock(RedisCacheService.class);
        org.mockito.Mockito.doThrow(new RuntimeException("Redis unavailable"))
                .when(failingCache).invalidatePattern("cache:jobs:*");
        CacheInvalidationListener failingListener = new CacheInvalidationListener(failingCache);

        // Should not throw — errors are logged and swallowed
        failingListener.onJobCreated(Map.of("jobId", UUID.randomUUID().toString()));
    }

    @Test
    void onLeaderboardChangedDoesNotThrowOnRedisFailure() {
        RedisCacheService failingCache = mock(RedisCacheService.class);
        String assessmentId = UUID.randomUUID().toString();
        org.mockito.Mockito.doThrow(new RuntimeException("Redis unavailable"))
                .when(failingCache).invalidate("cache:leaderboard:" + assessmentId);
        CacheInvalidationListener failingListener = new CacheInvalidationListener(failingCache);

        // Should not throw — errors are logged and swallowed
        failingListener.onLeaderboardChanged(Map.of("assessmentId", assessmentId));
    }
}
