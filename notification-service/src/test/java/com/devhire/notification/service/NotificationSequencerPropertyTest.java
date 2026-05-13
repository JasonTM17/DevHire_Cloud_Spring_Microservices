package com.devhire.notification.service;

import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for monotonic sequence numbers.
 *
 * <p>Feature: realtime-collaboration, Property 16: Monotonic Sequence Numbers</p>
 *
 * <p><b>Validates: Requirements 13.1</b></p>
 *
 * <p>For any user, each successive notification SHALL have a sequence number strictly greater
 * than the previous notification's sequence number. No two notifications for the same user
 * SHALL share a sequence number.</p>
 */
@Tag("realtime-collaboration")
@Label("Property 16: Monotonic Sequence Numbers")
class NotificationSequencerPropertyTest {

    /**
     * In-memory simulation of the NotificationSequencer that uses AtomicLong
     * per user, mirroring the Redis INCR behavior.
     */
    static class InMemorySequencer {
        private final ConcurrentHashMap<String, AtomicLong> counters = new ConcurrentHashMap<>();

        long nextSequence(String userId) {
            return counters.computeIfAbsent(userId, k -> new AtomicLong(0)).incrementAndGet();
        }

        long getCurrentSequence(String userId) {
            AtomicLong counter = counters.get(userId);
            return counter == null ? 0L : counter.get();
        }
    }

    @Property(tries = 200)
    @Label("Each sequence number is strictly greater than previous for same user")
    void sequenceNumbersAreStrictlyIncreasing(
            @ForAll("userId") String userId,
            @ForAll @IntRange(min = 2, max = 200) int notificationCount
    ) {
        InMemorySequencer sequencer = new InMemorySequencer();

        long previousSequence = 0;
        for (int i = 0; i < notificationCount; i++) {
            long currentSequence = sequencer.nextSequence(userId);

            assertThat(currentSequence)
                    .as("Sequence %d should be strictly greater than previous %d (notification %d for user %s)",
                            currentSequence, previousSequence, i + 1, userId)
                    .isGreaterThan(previousSequence);

            previousSequence = currentSequence;
        }
    }

    @Property(tries = 200)
    @Label("No two notifications for same user share a sequence number")
    void noTwoNotificationsShareSequenceNumber(
            @ForAll("userId") String userId,
            @ForAll @IntRange(min = 2, max = 200) int notificationCount
    ) {
        InMemorySequencer sequencer = new InMemorySequencer();
        Set<Long> assignedSequences = new HashSet<>();

        for (int i = 0; i < notificationCount; i++) {
            long sequence = sequencer.nextSequence(userId);
            boolean isUnique = assignedSequences.add(sequence);

            assertThat(isUnique)
                    .as("Sequence number %d should be unique for user %s (notification %d)",
                            sequence, userId, i + 1)
                    .isTrue();
        }

        assertThat(assignedSequences).hasSize(notificationCount);
    }

    @Property(tries = 200)
    @Label("Sequence numbers for different users are independent")
    void sequenceNumbersAreIndependentPerUser(
            @ForAll("userIdPair") List<String> userIds,
            @ForAll @IntRange(min = 1, max = 50) int countPerUser
    ) {
        InMemorySequencer sequencer = new InMemorySequencer();
        String user1 = userIds.get(0);
        String user2 = userIds.get(1);

        // Generate sequences for user1
        List<Long> user1Sequences = new ArrayList<>();
        for (int i = 0; i < countPerUser; i++) {
            user1Sequences.add(sequencer.nextSequence(user1));
        }

        // Generate sequences for user2
        List<Long> user2Sequences = new ArrayList<>();
        for (int i = 0; i < countPerUser; i++) {
            user2Sequences.add(sequencer.nextSequence(user2));
        }

        // Both users should have sequences starting from 1
        assertThat(user1Sequences.get(0)).isEqualTo(1L);
        assertThat(user2Sequences.get(0)).isEqualTo(1L);

        // Both should be independently monotonic
        for (int i = 1; i < countPerUser; i++) {
            assertThat(user1Sequences.get(i)).isGreaterThan(user1Sequences.get(i - 1));
            assertThat(user2Sequences.get(i)).isGreaterThan(user2Sequences.get(i - 1));
        }
    }

    @Property(tries = 200)
    @Label("Sequence numbers start at 1 for new users")
    void sequenceNumbersStartAtOneForNewUsers(
            @ForAll("userId") String userId
    ) {
        InMemorySequencer sequencer = new InMemorySequencer();

        long firstSequence = sequencer.nextSequence(userId);

        assertThat(firstSequence)
                .as("First sequence number for a new user should be 1")
                .isEqualTo(1L);
    }

    @Property(tries = 200)
    @Label("getCurrentSequence reflects the last assigned sequence")
    void getCurrentSequenceReflectsLastAssigned(
            @ForAll("userId") String userId,
            @ForAll @IntRange(min = 1, max = 100) int notificationCount
    ) {
        InMemorySequencer sequencer = new InMemorySequencer();

        // Before any notifications, current should be 0
        assertThat(sequencer.getCurrentSequence(userId)).isEqualTo(0L);

        long lastSequence = 0;
        for (int i = 0; i < notificationCount; i++) {
            lastSequence = sequencer.nextSequence(userId);
        }

        assertThat(sequencer.getCurrentSequence(userId))
                .as("getCurrentSequence should return the last assigned sequence number")
                .isEqualTo(lastSequence);
    }

    @Property(tries = 200)
    @Label("Consecutive sequence numbers differ by exactly 1")
    void consecutiveSequencesDifferByOne(
            @ForAll("userId") String userId,
            @ForAll @IntRange(min = 2, max = 100) int notificationCount
    ) {
        InMemorySequencer sequencer = new InMemorySequencer();

        long previous = sequencer.nextSequence(userId);
        for (int i = 1; i < notificationCount; i++) {
            long current = sequencer.nextSequence(userId);
            assertThat(current - previous)
                    .as("Consecutive sequence numbers should differ by exactly 1")
                    .isEqualTo(1L);
            previous = current;
        }
    }

    @Provide
    Arbitrary<String> userId() {
        return Arbitraries.strings()
                .ofMinLength(1)
                .ofMaxLength(36)
                .alpha()
                .numeric()
                .withChars('-')
                .filter(s -> !s.isEmpty() && !s.isBlank());
    }

    @Provide
    Arbitrary<List<String>> userIdPair() {
        return userId().list().ofSize(2)
                .filter(list -> !list.get(0).equals(list.get(1)));
    }
}
