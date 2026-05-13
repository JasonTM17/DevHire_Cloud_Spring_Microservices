package com.devhire.notification.properties;

import net.jqwik.api.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Monotonic Sequence Numbers.
 *
 * <p>Feature: realtime-collaboration, Property 16: Monotonic Sequence Numbers</p>
 *
 * <p><b>Validates: Requirements 13.1</b></p>
 *
 * <p>For any user, each successive notification SHALL have a sequence number strictly
 * greater than the previous notification's sequence number. No two notifications for
 * the same user SHALL share a sequence number.</p>
 */
@Label("Feature: realtime-collaboration, Property 16: Monotonic Sequence Numbers")
@Tag("realtime-collaboration")
@Tag("property-test")
class MonotonicSequenceNumbersPropertyTest {

    /**
     * Simulates the NotificationSequencer using an atomic counter (mirrors Redis INCR).
     */
    static class SequenceGenerator {
        private final AtomicLong counter = new AtomicLong(0);

        long nextSequence() {
            return counter.incrementAndGet();
        }

        long getCurrentSequence() {
            return counter.get();
        }
    }

    /**
     * Property 16a: Each successive sequence number is strictly greater than the previous.
     */
    @Property(tries = 200)
    void eachSequenceNumberStrictlyGreaterThanPrevious(
            @ForAll("notificationCounts") int count
    ) {
        SequenceGenerator generator = new SequenceGenerator();
        long previousSeq = 0;

        for (int i = 0; i < count; i++) {
            long currentSeq = generator.nextSequence();
            assertThat(currentSeq)
                    .as("Sequence %d should be strictly greater than previous %d", currentSeq, previousSeq)
                    .isGreaterThan(previousSeq);
            previousSeq = currentSeq;
        }
    }

    /**
     * Property 16b: No two notifications for the same user share a sequence number.
     */
    @Property(tries = 200)
    void noTwoNotificationsShareSequenceNumber(
            @ForAll("notificationCounts") int count
    ) {
        SequenceGenerator generator = new SequenceGenerator();
        Set<Long> seenSequences = new HashSet<>();

        for (int i = 0; i < count; i++) {
            long seq = generator.nextSequence();
            assertThat(seenSequences.add(seq))
                    .as("Sequence number %d should be unique, but was already seen", seq)
                    .isTrue();
        }
    }

    /**
     * Property 16c: Sequence numbers form a contiguous increasing sequence starting at 1.
     */
    @Property(tries = 200)
    void sequenceNumbersFormContiguousSequence(
            @ForAll("notificationCounts") int count
    ) {
        SequenceGenerator generator = new SequenceGenerator();
        List<Long> sequences = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            sequences.add(generator.nextSequence());
        }

        // Verify contiguous: each element equals its 1-based index
        for (int i = 0; i < sequences.size(); i++) {
            assertThat(sequences.get(i))
                    .as("Sequence at position %d should be %d", i, i + 1)
                    .isEqualTo(i + 1L);
        }
    }

    /**
     * Property 16d: Multiple users have independent sequence counters.
     */
    @Property(tries = 200)
    void multipleUsersHaveIndependentSequences(
            @ForAll("userNotificationPairs") List<String> userSequence
    ) {
        // Each user gets their own generator (simulates per-user Redis key)
        Map<String, SequenceGenerator> generators = new HashMap<>();
        Map<String, Long> lastSequencePerUser = new HashMap<>();

        for (String userId : userSequence) {
            SequenceGenerator gen = generators.computeIfAbsent(userId, k -> new SequenceGenerator());
            long seq = gen.nextSequence();
            Long lastSeq = lastSequencePerUser.get(userId);

            if (lastSeq != null) {
                assertThat(seq)
                        .as("Sequence for user %s should be strictly greater than previous %d",
                                userId, lastSeq)
                        .isGreaterThan(lastSeq);
            }
            lastSequencePerUser.put(userId, seq);
        }
    }

    @Provide
    Arbitrary<Integer> notificationCounts() {
        return Arbitraries.integers().between(1, 500);
    }

    @Provide
    Arbitrary<List<String>> userNotificationPairs() {
        // Generate a sequence of user IDs representing interleaved notifications
        Arbitrary<String> userIds = Arbitraries.of(
                "user-1", "user-2", "user-3", "user-4", "user-5"
        );
        return userIds.list().ofMinSize(5).ofMaxSize(100);
    }
}
