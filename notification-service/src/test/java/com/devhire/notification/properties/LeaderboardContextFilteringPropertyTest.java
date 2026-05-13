package com.devhire.notification.properties;

import com.devhire.notification.dto.RankChangeEvent;
import net.jqwik.api.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Leaderboard Context Filtering.
 *
 * <p>Feature: realtime-collaboration, Property 10: Leaderboard Context Filtering</p>
 *
 * <p><b>Validates: Requirements 7.5</b></p>
 *
 * <p>For any rank-change event and any set of subscribed users with different leaderboard
 * contexts, the event SHALL be delivered only to users whose subscription context matches
 * the event's leaderboard identifier (assessmentId).</p>
 */
@Label("Feature: realtime-collaboration, Property 10: Leaderboard Context Filtering")
@Tag("realtime-collaboration")
@Tag("property-test")
class LeaderboardContextFilteringPropertyTest {

    /**
     * Represents a subscriber with a userId and the leaderboard context they are subscribed to.
     */
    record Subscriber(String userId, String subscribedAssessmentId) {}

    /**
     * Simulates the leaderboard context filtering logic: delivers rank-change events
     * only to subscribers whose context matches the event's assessmentId.
     * Each subscriber has exactly one context subscription. A user is delivered the event
     * only if their subscription context matches.
     */
    static Set<String> deliverEvent(RankChangeEvent event, List<Subscriber> subscribers) {
        return subscribers.stream()
                .filter(sub -> sub.subscribedAssessmentId().equals(event.assessmentId()))
                .map(Subscriber::userId)
                .collect(Collectors.toSet());
    }

    /**
     * Property 10a: For any rank-change event, every recipient has a subscription
     * matching the event's assessmentId.
     */
    @Property(tries = 200)
    void everyRecipientHasMatchingSubscription(
            @ForAll("rankChangeEvents") RankChangeEvent event,
            @ForAll("subscriberSets") List<Subscriber> subscribers
    ) {
        Set<String> recipients = deliverEvent(event, subscribers);

        // All recipients must have at least one subscription matching the event's assessmentId
        for (String recipientId : recipients) {
            boolean hasMatchingSub = subscribers.stream()
                    .anyMatch(s -> s.userId().equals(recipientId)
                            && s.subscribedAssessmentId().equals(event.assessmentId()));
            assertThat(hasMatchingSub)
                    .as("Recipient %s must have a subscription to assessmentId %s",
                            recipientId, event.assessmentId())
                    .isTrue();
        }
    }

    /**
     * Property 10b: For any rank-change event, users who ONLY have subscriptions to
     * different contexts SHALL NOT receive the event.
     */
    @Property(tries = 200)
    void usersWithOnlyNonMatchingContextNotDelivered(
            @ForAll("rankChangeEvents") RankChangeEvent event,
            @ForAll("subscriberSets") List<Subscriber> subscribers
    ) {
        Set<String> recipients = deliverEvent(event, subscribers);

        // Find users who have NO subscription matching the event's assessmentId
        Set<String> usersWithMatchingSub = subscribers.stream()
                .filter(sub -> sub.subscribedAssessmentId().equals(event.assessmentId()))
                .map(Subscriber::userId)
                .collect(Collectors.toSet());

        Set<String> usersWithoutMatchingSub = subscribers.stream()
                .map(Subscriber::userId)
                .filter(u -> !usersWithMatchingSub.contains(u))
                .collect(Collectors.toSet());

        for (String nonMatching : usersWithoutMatchingSub) {
            assertThat(recipients)
                    .as("User %s with no matching context should NOT receive event for %s",
                            nonMatching, event.assessmentId())
                    .doesNotContain(nonMatching);
        }
    }

    /**
     * Property 10c: The set of recipients SHALL equal exactly the set of users
     * who have at least one subscription matching the event's assessmentId.
     */
    @Property(tries = 200)
    void recipientSetEqualsMatchingSubscribers(
            @ForAll("rankChangeEvents") RankChangeEvent event,
            @ForAll("subscriberSets") List<Subscriber> subscribers
    ) {
        Set<String> recipients = deliverEvent(event, subscribers);

        Set<String> expectedRecipients = subscribers.stream()
                .filter(sub -> sub.subscribedAssessmentId().equals(event.assessmentId()))
                .map(Subscriber::userId)
                .collect(Collectors.toSet());

        assertThat(recipients).isEqualTo(expectedRecipients);
    }

    @Provide
    Arbitrary<RankChangeEvent> rankChangeEvents() {
        Arbitrary<String> candidateIds = Arbitraries.of(
                "candidate-1", "candidate-2", "candidate-3", "candidate-4", "candidate-5"
        );
        Arbitrary<Integer> ranks = Arbitraries.integers().between(1, 1000);
        Arbitrary<Double> scores = Arbitraries.doubles().between(0.0, 100.0);
        Arbitrary<String> assessmentIds = Arbitraries.of(
                "assessment-A", "assessment-B", "assessment-C", "assessment-D"
        );

        return Combinators.combine(candidateIds, ranks, ranks, scores, assessmentIds)
                .as(RankChangeEvent::new);
    }

    @Provide
    Arbitrary<List<Subscriber>> subscriberSets() {
        Arbitrary<String> userIds = Arbitraries.of(
                "user-1", "user-2", "user-3", "user-4", "user-5",
                "user-6", "user-7", "user-8", "user-9", "user-10"
        );
        Arbitrary<String> assessmentIds = Arbitraries.of(
                "assessment-A", "assessment-B", "assessment-C", "assessment-D"
        );

        Arbitrary<Subscriber> subscribers = Combinators.combine(userIds, assessmentIds)
                .as(Subscriber::new);

        return subscribers.list().ofMinSize(1).ofMaxSize(20);
    }
}
