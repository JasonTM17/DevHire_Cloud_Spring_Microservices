package com.devhire.notification.event;

import com.devhire.notification.dto.RankChangeEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Size;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Property 10: Leaderboard Context Filtering
 * <p>
 * For any rank-change event and any set of subscribed users with different leaderboard contexts,
 * the event SHALL be delivered only to users whose subscription context matches the event's
 * leaderboard identifier.
 * <p>
 * <b>Validates: Requirements 7.5</b>
 * <p>
 * Feature: realtime-collaboration, Property 10: Leaderboard Context Filtering
 */
@Tag("realtime-collaboration")
@Tag("Property-10-Leaderboard-Context-Filtering")
class LeaderboardContextFilteringPropertyTest {

    /**
     * Property 10: For any rank-change event targeting a specific assessmentId,
     * the LeaderboardEventListener publishes to the STOMP destination
     * /topic/leaderboard/{assessmentId}, ensuring only subscribers of that
     * specific assessment context receive the event.
     * <p>
     * <b>Validates: Requirements 7.5</b>
     */
    @Property(tries = 150)
    void eventsDeliveredOnlyToMatchingContextSubscribers(
            @ForAll("rankChangeScenarios") RankChangeScenario scenario
    ) {
        // Setup
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        LeaderboardEventListener listener = new LeaderboardEventListener(messagingTemplate, objectMapper);

        // The event targets a specific assessmentId
        String targetAssessmentId = scenario.targetAssessmentId();

        // Create a LeaderboardChangedEvent using a Map payload (simulating Kafka deserialization)
        Map<String, Object> eventPayload = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "candidateId", scenario.candidateId().toString(),
                "assessmentId", targetAssessmentId,
                "newRank", scenario.newRank(),
                "previousRank", scenario.previousRank(),
                "score", scenario.score(),
                "occurredAt", java.time.Instant.now().toString()
        );

        // Act: publish the event
        listener.onLeaderboardChanged(eventPayload);

        // Assert: event is published ONLY to the target assessment's destination
        String expectedDestination = "/topic/leaderboard/" + targetAssessmentId;
        ArgumentCaptor<String> destinationCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate, times(1)).convertAndSend(destinationCaptor.capture(), anyString());

        String actualDestination = destinationCaptor.getValue();
        assertThat(actualDestination).isEqualTo(expectedDestination);

        // Verify that no other assessment destinations received the event
        for (String otherAssessmentId : scenario.otherAssessmentIds()) {
            String otherDestination = "/topic/leaderboard/" + otherAssessmentId;
            verify(messagingTemplate, never()).convertAndSend(eq(otherDestination), anyString());
        }
    }

    /**
     * Property 10 (extended): Multiple events for different assessments are each
     * delivered only to their respective context destinations.
     * <p>
     * <b>Validates: Requirements 7.5</b>
     */
    @Property(tries = 150)
    void multipleEventsRoutedToCorrectContexts(
            @ForAll("multiEventScenarios") MultiEventScenario scenario
    ) {
        // Setup
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        LeaderboardEventListener listener = new LeaderboardEventListener(messagingTemplate, objectMapper);

        // Act: publish events for different assessments (using different candidates to avoid debounce)
        for (EventWithContext event : scenario.events()) {
            Map<String, Object> payload = Map.of(
                    "eventId", UUID.randomUUID().toString(),
                    "candidateId", event.candidateId().toString(),
                    "assessmentId", event.assessmentId(),
                    "newRank", event.newRank(),
                    "previousRank", event.previousRank(),
                    "score", event.score(),
                    "occurredAt", java.time.Instant.now().toString()
            );
            listener.onLeaderboardChanged(payload);
        }

        // Assert: each event was published to its own assessment-specific destination
        ArgumentCaptor<String> destinationCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate, times(scenario.events().size()))
                .convertAndSend(destinationCaptor.capture(), anyString());

        List<String> publishedDestinations = destinationCaptor.getAllValues();

        for (int i = 0; i < scenario.events().size(); i++) {
            EventWithContext event = scenario.events().get(i);
            String expectedDest = "/topic/leaderboard/" + event.assessmentId();
            assertThat(publishedDestinations.get(i)).isEqualTo(expectedDest);
        }
    }

    @Provide
    Arbitrary<RankChangeScenario> rankChangeScenarios() {
        Arbitrary<UUID> candidateIds = Arbitraries.create(UUID::randomUUID);
        Arbitrary<String> assessmentIds = Arbitraries.create(() -> UUID.randomUUID().toString());
        Arbitrary<Integer> ranks = Arbitraries.integers().between(1, 1000);
        Arbitrary<Double> scores = Arbitraries.doubles().between(0.0, 100.0);
        Arbitrary<List<String>> otherAssessments = Arbitraries.create(() -> UUID.randomUUID().toString())
                .list().ofMinSize(1).ofMaxSize(5);

        return Combinators.combine(candidateIds, assessmentIds, ranks, ranks, scores, otherAssessments)
                .as((candidateId, targetAssessmentId, newRank, previousRank, score, others) ->
                        new RankChangeScenario(
                                candidateId,
                                targetAssessmentId,
                                newRank,
                                previousRank,
                                score,
                                others.stream()
                                        .filter(id -> !id.equals(targetAssessmentId))
                                        .collect(Collectors.toList())
                        ));
    }

    @Provide
    Arbitrary<MultiEventScenario> multiEventScenarios() {
        Arbitrary<EventWithContext> events = Combinators.combine(
                Arbitraries.create(UUID::randomUUID),
                Arbitraries.create(() -> UUID.randomUUID().toString()),
                Arbitraries.integers().between(1, 100),
                Arbitraries.integers().between(1, 100),
                Arbitraries.doubles().between(0.0, 100.0)
        ).as(EventWithContext::new);

        return events.list().ofMinSize(2).ofMaxSize(5)
                .map(MultiEventScenario::new);
    }

    record RankChangeScenario(
            UUID candidateId,
            String targetAssessmentId,
            int newRank,
            int previousRank,
            double score,
            List<String> otherAssessmentIds
    ) {}

    record EventWithContext(
            UUID candidateId,
            String assessmentId,
            int newRank,
            int previousRank,
            double score
    ) {}

    record MultiEventScenario(List<EventWithContext> events) {}
}
