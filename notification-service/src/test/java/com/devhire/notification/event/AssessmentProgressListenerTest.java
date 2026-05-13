package com.devhire.notification.event;

import com.devhire.common.event.AssessmentProgressEvent;
import com.devhire.notification.dto.AssessmentProgressPayload;
import com.devhire.notification.dto.AssessmentSummaryPayload;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class AssessmentProgressListenerTest {

    private SimpMessagingTemplate messagingTemplate;
    private ObjectMapper objectMapper;
    private AssessmentProgressListener listener;

    @BeforeEach
    void setUp() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        listener = new AssessmentProgressListener(messagingTemplate, objectMapper);
    }

    @Test
    void publishesProgressEventToCorrectStompDestination() {
        UUID assessmentId = UUID.randomUUID();
        AssessmentProgressEvent event = new AssessmentProgressEvent(
                UUID.randomUUID(),
                assessmentId,
                UUID.randomUUID(),
                2,
                10,
                "passed",
                150L,
                null,
                false,
                null,
                null,
                null,
                null,
                Instant.now()
        );

        listener.onAssessmentProgress(event);

        String expectedDestination = "/topic/assessment/" + assessmentId + "/status";
        verify(messagingTemplate).convertAndSend(eq(expectedDestination), anyString());
    }

    @Test
    void progressPayloadContainsAllRequiredFields() throws Exception {
        UUID assessmentId = UUID.randomUUID();
        AssessmentProgressEvent event = new AssessmentProgressEvent(
                UUID.randomUUID(),
                assessmentId,
                UUID.randomUUID(),
                3,
                8,
                "failed",
                250L,
                "AssertionError: expected 5 but got 3",
                false,
                null,
                null,
                null,
                null,
                Instant.now()
        );

        listener.onAssessmentProgress(event);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());

        AssessmentProgressPayload parsed = objectMapper.readValue(
                payloadCaptor.getValue(), AssessmentProgressPayload.class);
        assertThat(parsed.assessmentId()).isEqualTo(assessmentId.toString());
        assertThat(parsed.testCaseIndex()).isEqualTo(3);
        assertThat(parsed.totalTestCases()).isEqualTo(8);
        assertThat(parsed.status()).isEqualTo("failed");
        assertThat(parsed.executionTimeMs()).isEqualTo(250L);
        assertThat(parsed.errorOutput()).isEqualTo("AssertionError: expected 5 but got 3");
    }

    @Test
    void progressPayloadOmitsNullErrorOutput() throws Exception {
        UUID assessmentId = UUID.randomUUID();
        AssessmentProgressEvent event = new AssessmentProgressEvent(
                UUID.randomUUID(),
                assessmentId,
                UUID.randomUUID(),
                1,
                5,
                "passed",
                100L,
                null,
                false,
                null,
                null,
                null,
                null,
                Instant.now()
        );

        listener.onAssessmentProgress(event);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());

        String payload = payloadCaptor.getValue();
        assertThat(payload).doesNotContain("errorOutput");
    }

    @Test
    void publishesSummaryEventWhenFinal() throws Exception {
        UUID assessmentId = UUID.randomUUID();
        AssessmentProgressEvent event = new AssessmentProgressEvent(
                UUID.randomUUID(),
                assessmentId,
                UUID.randomUUID(),
                10,
                10,
                "passed",
                120L,
                null,
                true,
                8,
                2,
                80.0,
                "COMPLETED",
                Instant.now()
        );

        listener.onAssessmentProgress(event);

        String expectedDestination = "/topic/assessment/" + assessmentId + "/status";
        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(eq(expectedDestination), payloadCaptor.capture());

        AssessmentSummaryPayload parsed = objectMapper.readValue(
                payloadCaptor.getValue(), AssessmentSummaryPayload.class);
        assertThat(parsed.assessmentId()).isEqualTo(assessmentId.toString());
        assertThat(parsed.totalPassed()).isEqualTo(8);
        assertThat(parsed.totalFailed()).isEqualTo(2);
        assertThat(parsed.score()).isEqualTo(80.0);
        assertThat(parsed.overallStatus()).isEqualTo("COMPLETED");
    }

    @Test
    void summaryEventDefaultsWhenFieldsAreNull() throws Exception {
        UUID assessmentId = UUID.randomUUID();
        AssessmentProgressEvent event = new AssessmentProgressEvent(
                UUID.randomUUID(),
                assessmentId,
                UUID.randomUUID(),
                5,
                5,
                "passed",
                100L,
                null,
                true,
                null,
                null,
                null,
                null,
                Instant.now()
        );

        listener.onAssessmentProgress(event);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());

        AssessmentSummaryPayload parsed = objectMapper.readValue(
                payloadCaptor.getValue(), AssessmentSummaryPayload.class);
        assertThat(parsed.totalPassed()).isZero();
        assertThat(parsed.totalFailed()).isZero();
        assertThat(parsed.score()).isZero();
        assertThat(parsed.overallStatus()).isEqualTo("COMPLETED");
    }

    @Test
    void handlesMapPayloadForProgressEvent() {
        UUID assessmentId = UUID.randomUUID();
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventId", UUID.randomUUID().toString());
        payload.put("assessmentId", assessmentId.toString());
        payload.put("candidateId", UUID.randomUUID().toString());
        payload.put("testCaseIndex", 4);
        payload.put("totalTestCases", 10);
        payload.put("status", "running");
        payload.put("executionTimeMs", 200L);
        payload.put("errorOutput", null);
        payload.put("isFinal", false);
        payload.put("occurredAt", Instant.now().toString());

        listener.onAssessmentProgress(payload);

        String expectedDestination = "/topic/assessment/" + assessmentId + "/status";
        verify(messagingTemplate).convertAndSend(eq(expectedDestination), anyString());
    }

    @Test
    void handlesMapPayloadForSummaryEvent() throws Exception {
        UUID assessmentId = UUID.randomUUID();
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventId", UUID.randomUUID().toString());
        payload.put("assessmentId", assessmentId.toString());
        payload.put("candidateId", UUID.randomUUID().toString());
        payload.put("testCaseIndex", 6);
        payload.put("totalTestCases", 6);
        payload.put("status", "passed");
        payload.put("executionTimeMs", 50L);
        payload.put("errorOutput", null);
        payload.put("isFinal", true);
        payload.put("totalPassed", 5);
        payload.put("totalFailed", 1);
        payload.put("score", 83.3);
        payload.put("overallStatus", "COMPLETED");
        payload.put("occurredAt", Instant.now().toString());

        listener.onAssessmentProgress(payload);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());

        AssessmentSummaryPayload parsed = objectMapper.readValue(
                payloadCaptor.getValue(), AssessmentSummaryPayload.class);
        assertThat(parsed.totalPassed()).isEqualTo(5);
        assertThat(parsed.totalFailed()).isEqualTo(1);
        assertThat(parsed.score()).isEqualTo(83.3);
        assertThat(parsed.overallStatus()).isEqualTo("COMPLETED");
    }

    @Test
    void ignoresUnsupportedPayloadType() {
        listener.onAssessmentProgress("unsupported string payload");

        verify(messagingTemplate, never()).convertAndSend(anyString(), anyString());
    }

    @Test
    void publishesFailedStatusWithErrorOutput() throws Exception {
        UUID assessmentId = UUID.randomUUID();
        AssessmentProgressEvent event = new AssessmentProgressEvent(
                UUID.randomUUID(),
                assessmentId,
                UUID.randomUUID(),
                5,
                10,
                "failed",
                500L,
                "TimeoutException: test exceeded 5000ms",
                false,
                null,
                null,
                null,
                null,
                Instant.now()
        );

        listener.onAssessmentProgress(event);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());

        AssessmentProgressPayload parsed = objectMapper.readValue(
                payloadCaptor.getValue(), AssessmentProgressPayload.class);
        assertThat(parsed.status()).isEqualTo("failed");
        assertThat(parsed.errorOutput()).isEqualTo("TimeoutException: test exceeded 5000ms");
        assertThat(parsed.executionTimeMs()).isEqualTo(500L);
    }

    @Test
    void publishesSummaryWithFailedOverallStatus() throws Exception {
        UUID assessmentId = UUID.randomUUID();
        AssessmentProgressEvent event = new AssessmentProgressEvent(
                UUID.randomUUID(),
                assessmentId,
                UUID.randomUUID(),
                10,
                10,
                "failed",
                300L,
                null,
                true,
                3,
                7,
                30.0,
                "FAILED",
                Instant.now()
        );

        listener.onAssessmentProgress(event);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());

        AssessmentSummaryPayload parsed = objectMapper.readValue(
                payloadCaptor.getValue(), AssessmentSummaryPayload.class);
        assertThat(parsed.overallStatus()).isEqualTo("FAILED");
        assertThat(parsed.totalPassed()).isEqualTo(3);
        assertThat(parsed.totalFailed()).isEqualTo(7);
        assertThat(parsed.score()).isEqualTo(30.0);
    }
}
