package com.devhire.notification.event;

import com.devhire.common.event.LeaderboardChangedEvent;
import com.devhire.notification.dto.RankChangeEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class LeaderboardEventListenerTest {

    private SimpMessagingTemplate messagingTemplate;
    private ObjectMapper objectMapper;
    private LeaderboardEventListener listener;

    @BeforeEach
    void setUp() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        listener = new LeaderboardEventListener(messagingTemplate, objectMapper);
    }

    @Test
    void publishesRankChangeEventToCorrectStompDestination() {
        UUID candidateId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();
        LeaderboardChangedEvent event = new LeaderboardChangedEvent(
                UUID.randomUUID(),
                candidateId,
                assessmentId,
                3,
                7,
                92.5,
                Instant.now()
        );

        listener.onLeaderboardChanged(event);

        String expectedDestination = "/topic/leaderboard/" + assessmentId;
        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(eq(expectedDestination), payloadCaptor.capture());

        String payload = payloadCaptor.getValue();
        assertThat(payload).contains(candidateId.toString());
        assertThat(payload).contains(assessmentId.toString());
        assertThat(payload).contains("\"newRank\":3");
        assertThat(payload).contains("\"previousRank\":7");
        assertThat(payload).contains("\"score\":92.5");
    }

    @Test
    void includesAllRequiredFieldsInPayload() throws Exception {
        UUID candidateId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();
        LeaderboardChangedEvent event = new LeaderboardChangedEvent(
                UUID.randomUUID(),
                candidateId,
                assessmentId,
                1,
                5,
                98.0,
                Instant.now()
        );

        listener.onLeaderboardChanged(event);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());

        RankChangeEvent parsed = objectMapper.readValue(payloadCaptor.getValue(), RankChangeEvent.class);
        assertThat(parsed.candidateId()).isEqualTo(candidateId.toString());
        assertThat(parsed.assessmentId()).isEqualTo(assessmentId.toString());
        assertThat(parsed.newRank()).isEqualTo(1);
        assertThat(parsed.previousRank()).isEqualTo(5);
        assertThat(parsed.score()).isEqualTo(98.0);
    }

    @Test
    void debouncesSameCandidate() {
        UUID candidateId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();
        LeaderboardChangedEvent event1 = new LeaderboardChangedEvent(
                UUID.randomUUID(), candidateId, assessmentId, 3, 7, 92.5, Instant.now()
        );
        LeaderboardChangedEvent event2 = new LeaderboardChangedEvent(
                UUID.randomUUID(), candidateId, assessmentId, 2, 3, 95.0, Instant.now()
        );

        // First event should be published
        listener.onLeaderboardChanged(event1);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/leaderboard/" + assessmentId), anyString());

        // Second event within 5s should be debounced
        listener.onLeaderboardChanged(event2);
        // Still only one invocation total
        verify(messagingTemplate).convertAndSend(
                eq("/topic/leaderboard/" + assessmentId), anyString());
    }

    @Test
    void allowsDifferentCandidatesWithinDebounceWindow() {
        UUID candidateId1 = UUID.randomUUID();
        UUID candidateId2 = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();

        LeaderboardChangedEvent event1 = new LeaderboardChangedEvent(
                UUID.randomUUID(), candidateId1, assessmentId, 3, 7, 92.5, Instant.now()
        );
        LeaderboardChangedEvent event2 = new LeaderboardChangedEvent(
                UUID.randomUUID(), candidateId2, assessmentId, 1, 2, 99.0, Instant.now()
        );

        listener.onLeaderboardChanged(event1);
        listener.onLeaderboardChanged(event2);

        // Both should be published since they are different candidates
        String destination = "/topic/leaderboard/" + assessmentId;
        verify(messagingTemplate, org.mockito.Mockito.times(2)).convertAndSend(eq(destination), anyString());
    }

    @Test
    void publishesAfterDebounceWindowExpires() {
        UUID candidateId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();
        LeaderboardChangedEvent event = new LeaderboardChangedEvent(
                UUID.randomUUID(), candidateId, assessmentId, 3, 7, 92.5, Instant.now()
        );

        // Simulate expired debounce by setting timestamp in the past
        listener.getLastPublishTimestamps().put(
                candidateId.toString(),
                Instant.now().toEpochMilli() - 6_000L
        );

        listener.onLeaderboardChanged(event);

        verify(messagingTemplate).convertAndSend(
                eq("/topic/leaderboard/" + assessmentId), anyString());
    }

    @Test
    void handlesMapPayload() {
        UUID candidateId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();
        Map<String, Object> payload = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "candidateId", candidateId.toString(),
                "assessmentId", assessmentId.toString(),
                "newRank", 2,
                "previousRank", 5,
                "score", 88.5,
                "occurredAt", Instant.now().toString()
        );

        listener.onLeaderboardChanged(payload);

        verify(messagingTemplate).convertAndSend(
                eq("/topic/leaderboard/" + assessmentId), anyString());
    }

    @Test
    void contextFilteringPublishesToAssessmentSpecificDestination() {
        UUID candidateId = UUID.randomUUID();
        UUID assessmentId1 = UUID.randomUUID();
        UUID assessmentId2 = UUID.randomUUID();

        LeaderboardChangedEvent event1 = new LeaderboardChangedEvent(
                UUID.randomUUID(), candidateId, assessmentId1, 3, 7, 92.5, Instant.now()
        );

        // Use a different candidate to avoid debounce
        UUID candidateId2 = UUID.randomUUID();
        LeaderboardChangedEvent event2 = new LeaderboardChangedEvent(
                UUID.randomUUID(), candidateId2, assessmentId2, 1, 2, 99.0, Instant.now()
        );

        listener.onLeaderboardChanged(event1);
        listener.onLeaderboardChanged(event2);

        // Each event goes to its own assessment-specific destination
        verify(messagingTemplate).convertAndSend(
                eq("/topic/leaderboard/" + assessmentId1), anyString());
        verify(messagingTemplate).convertAndSend(
                eq("/topic/leaderboard/" + assessmentId2), anyString());
    }

    @Test
    void ignoresUnsupportedPayloadType() {
        listener.onLeaderboardChanged("unsupported string payload");

        verify(messagingTemplate, never()).convertAndSend(anyString(), anyString());
    }

    @Test
    void shouldPublishReturnsTrueForNewCandidate() {
        String candidateId = UUID.randomUUID().toString();
        assertThat(listener.shouldPublish(candidateId)).isTrue();
    }

    @Test
    void shouldPublishReturnsFalseWithinDebounceWindow() {
        String candidateId = UUID.randomUUID().toString();
        listener.shouldPublish(candidateId); // first call sets timestamp
        assertThat(listener.shouldPublish(candidateId)).isFalse();
    }

    @Test
    void shouldPublishReturnsTrueAfterDebounceWindowExpires() {
        String candidateId = UUID.randomUUID().toString();
        // Set timestamp 6 seconds in the past
        listener.getLastPublishTimestamps().put(candidateId, Instant.now().toEpochMilli() - 6_000L);
        assertThat(listener.shouldPublish(candidateId)).isTrue();
    }
}
