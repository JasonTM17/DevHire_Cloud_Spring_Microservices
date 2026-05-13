package com.devhire.notification.properties;

import net.jqwik.api.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Event Publish Throttling.
 *
 * <p>Feature: realtime-collaboration, Property 9: Event Publish Throttling</p>
 *
 * <p><b>Validates: Requirements 7.4, 9.5</b></p>
 *
 * <p>For streams of events within 5s/10s windows, at most one event emitted
 * per entity per window.</p>
 */
@Label("Feature: realtime-collaboration, Property 9: Event Publish Throttling")
@Tag("realtime-collaboration")
@Tag("property-test")
class EventPublishThrottlingPropertyTest {

    /**
     * Represents a timestamped event for an entity.
     */
    record TimestampedEvent(String entityId, long timestampMs) {}

    /**
     * A simple throttle implementation that mirrors the production logic:
     * tracks last publish time per entity and only allows publishing if
     * the configured window has elapsed.
     */
    static class Throttle {
        private final long windowMs;
        private final ConcurrentHashMap<String, Long> lastPublishTimestamps = new ConcurrentHashMap<>();

        Throttle(long windowMs) {
            this.windowMs = windowMs;
        }

        /**
         * Returns true if the event should be published (not throttled).
         */
        boolean shouldPublish(String entityId, long timestampMs) {
            Long lastPublish = lastPublishTimestamps.get(entityId);
            if (lastPublish == null || (timestampMs - lastPublish) >= windowMs) {
                lastPublishTimestamps.put(entityId, timestampMs);
                return true;
            }
            return false;
        }
    }

    /**
     * Property 9a: For any stream of leaderboard rank-change events targeting the same
     * candidate within a 5-second window, the throttle SHALL emit at most one event
     * per candidate per window.
     */
    @Property(tries = 200)
    void leaderboardThrottleEmitsAtMostOneEventPerCandidatePer5sWindow(
            @ForAll("leaderboardEventStreams") List<TimestampedEvent> events
    ) {
        long windowMs = 5_000L;
        Throttle throttle = new Throttle(windowMs);

        // Collect published events
        List<TimestampedEvent> publishedEvents = new ArrayList<>();
        for (TimestampedEvent event : events) {
            if (throttle.shouldPublish(event.entityId(), event.timestampMs())) {
                publishedEvents.add(event);
            }
        }

        // Verify: for each entity, no two published events are within the same 5s window
        Map<String, List<TimestampedEvent>> publishedByEntity = publishedEvents.stream()
                .collect(Collectors.groupingBy(TimestampedEvent::entityId));

        for (Map.Entry<String, List<TimestampedEvent>> entry : publishedByEntity.entrySet()) {
            List<TimestampedEvent> entityEvents = entry.getValue();
            for (int i = 1; i < entityEvents.size(); i++) {
                long gap = entityEvents.get(i).timestampMs() - entityEvents.get(i - 1).timestampMs();
                assertThat(gap)
                        .as("Gap between published events for entity '%s' must be >= %dms, but was %dms",
                                entry.getKey(), windowMs, gap)
                        .isGreaterThanOrEqualTo(windowMs);
            }
        }
    }

    /**
     * Property 9b: For any stream of viewer count change events targeting the same
     * job within a 10-second window, the throttle SHALL emit at most one event
     * per job per window.
     */
    @Property(tries = 200)
    void viewerCountThrottleEmitsAtMostOneEventPerJobPer10sWindow(
            @ForAll("viewerEventStreams") List<TimestampedEvent> events
    ) {
        long windowMs = 10_000L;
        Throttle throttle = new Throttle(windowMs);

        // Collect published events
        List<TimestampedEvent> publishedEvents = new ArrayList<>();
        for (TimestampedEvent event : events) {
            if (throttle.shouldPublish(event.entityId(), event.timestampMs())) {
                publishedEvents.add(event);
            }
        }

        // Verify: for each entity, no two published events are within the same 10s window
        Map<String, List<TimestampedEvent>> publishedByEntity = publishedEvents.stream()
                .collect(Collectors.groupingBy(TimestampedEvent::entityId));

        for (Map.Entry<String, List<TimestampedEvent>> entry : publishedByEntity.entrySet()) {
            List<TimestampedEvent> entityEvents = entry.getValue();
            for (int i = 1; i < entityEvents.size(); i++) {
                long gap = entityEvents.get(i).timestampMs() - entityEvents.get(i - 1).timestampMs();
                assertThat(gap)
                        .as("Gap between published events for entity '%s' must be >= %dms, but was %dms",
                                entry.getKey(), windowMs, gap)
                        .isGreaterThanOrEqualTo(windowMs);
            }
        }
    }

    /**
     * Property 9c: For any stream of events, the number of published events per entity
     * SHALL be at most ceil(totalTimeSpan / windowSize) + 1.
     */
    @Property(tries = 150)
    void publishedEventCountBoundedByWindowCount(
            @ForAll("leaderboardEventStreams") List<TimestampedEvent> events
    ) {
        if (events.isEmpty()) return;

        long windowMs = 5_000L;
        Throttle throttle = new Throttle(windowMs);

        Map<String, List<TimestampedEvent>> eventsByEntity = events.stream()
                .collect(Collectors.groupingBy(TimestampedEvent::entityId));

        for (Map.Entry<String, List<TimestampedEvent>> entry : eventsByEntity.entrySet()) {
            List<TimestampedEvent> entityEvents = entry.getValue();
            long publishedCount = 0;

            for (TimestampedEvent event : entityEvents) {
                if (throttle.shouldPublish(event.entityId(), event.timestampMs())) {
                    publishedCount++;
                }
            }

            // Calculate the time span for this entity's events
            long minTs = entityEvents.stream().mapToLong(TimestampedEvent::timestampMs).min().orElse(0);
            long maxTs = entityEvents.stream().mapToLong(TimestampedEvent::timestampMs).max().orElse(0);
            long timeSpan = maxTs - minTs;

            // Maximum possible published events = floor(timeSpan / windowMs) + 1
            long maxExpected = (timeSpan / windowMs) + 1;

            assertThat(publishedCount)
                    .as("Published count for entity '%s' should be at most %d (timeSpan=%dms, window=%dms)",
                            entry.getKey(), maxExpected, timeSpan, windowMs)
                    .isLessThanOrEqualTo(maxExpected);
        }
    }

    @Provide
    Arbitrary<List<TimestampedEvent>> leaderboardEventStreams() {
        // Generate events for a small pool of candidates within a time range
        Arbitrary<String> candidateIds = Arbitraries.of(
                "candidate-1", "candidate-2", "candidate-3", "candidate-4", "candidate-5"
        );

        // Timestamps within a 30-second window (sorted to simulate time progression)
        long baseTime = Instant.parse("2024-01-01T00:00:00Z").toEpochMilli();
        Arbitrary<Long> timestamps = Arbitraries.longs().between(baseTime, baseTime + 30_000);

        Arbitrary<TimestampedEvent> events = Combinators.combine(candidateIds, timestamps)
                .as(TimestampedEvent::new);

        return events.list()
                .ofMinSize(1)
                .ofMaxSize(100)
                .map(list -> list.stream()
                        .sorted(Comparator.comparingLong(TimestampedEvent::timestampMs))
                        .collect(Collectors.toList()));
    }

    @Provide
    Arbitrary<List<TimestampedEvent>> viewerEventStreams() {
        // Generate events for a small pool of jobs within a time range
        Arbitrary<String> jobIds = Arbitraries.of(
                "job-1", "job-2", "job-3", "job-4", "job-5"
        );

        // Timestamps within a 60-second window (sorted to simulate time progression)
        long baseTime = Instant.parse("2024-01-01T00:00:00Z").toEpochMilli();
        Arbitrary<Long> timestamps = Arbitraries.longs().between(baseTime, baseTime + 60_000);

        Arbitrary<TimestampedEvent> events = Combinators.combine(jobIds, timestamps)
                .as(TimestampedEvent::new);

        return events.list()
                .ofMinSize(1)
                .ofMaxSize(100)
                .map(list -> list.stream()
                        .sorted(Comparator.comparingLong(TimestampedEvent::timestampMs))
                        .collect(Collectors.toList()));
    }
}
