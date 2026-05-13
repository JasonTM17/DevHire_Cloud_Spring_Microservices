package com.devhire.notification.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.AssessmentProgressEvent;
import com.devhire.notification.dto.AssessmentProgressPayload;
import com.devhire.notification.dto.AssessmentSummaryPayload;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Kafka consumer for {@code assessment.progress} topic events.
 * Forwards progress events to the STOMP destination
 * {@code /topic/assessment/{assessmentId}/status} so that clients subscribed
 * to a specific assessment receive real-time test case progress updates.
 *
 * <p>For each test case completed, publishes an {@link AssessmentProgressPayload}
 * containing testCaseIndex, totalTestCases, status, executionTimeMs, and optional errorOutput.</p>
 *
 * <p>When the event is marked as final ({@code isFinal == true}), publishes an
 * {@link AssessmentSummaryPayload} containing totalPassed, totalFailed, score, and overallStatus.</p>
 *
 * <p>Requirements: 6.1, 6.2, 6.4</p>
 */
@Component
public class AssessmentProgressListener {

    private static final Logger log = LoggerFactory.getLogger(AssessmentProgressListener.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public AssessmentProgressListener(SimpMessagingTemplate messagingTemplate,
                                      ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = KafkaTopics.ASSESSMENT_PROGRESS,
            groupId = "${spring.kafka.consumer.group-id:notification-service}",
            properties = {
                    "spring.json.value.default.type=com.devhire.common.event.AssessmentProgressEvent"
            }
    )
    public void onAssessmentProgress(Object event) {
        if (event instanceof AssessmentProgressEvent progressEvent) {
            handleAssessmentProgress(progressEvent);
        } else if (event instanceof Map<?, ?> map) {
            handleMapPayload(map);
        } else {
            log.warn("unsupported_assessment_progress_event_payload type={}",
                    event == null ? "null" : event.getClass().getName());
        }
    }

    private void handleMapPayload(Map<?, ?> payload) {
        try {
            AssessmentProgressEvent event = new AssessmentProgressEvent(
                    uuid(payload, "eventId"),
                    uuid(payload, "assessmentId"),
                    uuid(payload, "candidateId"),
                    intValue(payload, "testCaseIndex"),
                    intValue(payload, "totalTestCases"),
                    stringValue(payload, "status"),
                    longValue(payload, "executionTimeMs"),
                    stringValue(payload, "errorOutput"),
                    booleanValue(payload, "isFinal"),
                    integerOrNull(payload, "totalPassed"),
                    integerOrNull(payload, "totalFailed"),
                    doubleOrNull(payload, "score"),
                    stringValue(payload, "overallStatus"),
                    instant(payload, "occurredAt")
            );
            handleAssessmentProgress(event);
        } catch (Exception ex) {
            log.error("Failed to parse assessment progress map payload: {}", ex.getMessage(), ex);
        }
    }

    private void handleAssessmentProgress(AssessmentProgressEvent event) {
        String assessmentId = event.assessmentId().toString();
        String destination = "/topic/assessment/" + assessmentId + "/status";

        if (event.isFinal()) {
            publishSummary(event, destination, assessmentId);
        } else {
            publishProgress(event, destination, assessmentId);
        }
    }

    private void publishProgress(AssessmentProgressEvent event, String destination, String assessmentId) {
        AssessmentProgressPayload payload = new AssessmentProgressPayload(
                assessmentId,
                event.testCaseIndex(),
                event.totalTestCases(),
                event.status(),
                event.executionTimeMs(),
                event.errorOutput()
        );

        try {
            String json = objectMapper.writeValueAsString(payload);
            messagingTemplate.convertAndSend(destination, json);
            log.debug("Published assessment progress to {} (test {}/{}, status={})",
                    destination, event.testCaseIndex(), event.totalTestCases(), event.status());
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize assessment progress event for assessment {}: {}",
                    assessmentId, ex.getMessage(), ex);
        }
    }

    private void publishSummary(AssessmentProgressEvent event, String destination, String assessmentId) {
        AssessmentSummaryPayload payload = new AssessmentSummaryPayload(
                assessmentId,
                event.totalPassed() != null ? event.totalPassed() : 0,
                event.totalFailed() != null ? event.totalFailed() : 0,
                event.score() != null ? event.score() : 0.0,
                event.overallStatus() != null ? event.overallStatus() : "COMPLETED"
        );

        try {
            String json = objectMapper.writeValueAsString(payload);
            messagingTemplate.convertAndSend(destination, json);
            log.info("Published assessment summary to {} (passed={}, failed={}, score={}, status={})",
                    destination, payload.totalPassed(), payload.totalFailed(),
                    payload.score(), payload.overallStatus());
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize assessment summary event for assessment {}: {}",
                    assessmentId, ex.getMessage(), ex);
        }
    }

    // --- Utility methods for parsing Map payloads ---

    private static UUID uuid(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        return value instanceof UUID uuid ? uuid : UUID.fromString(String.valueOf(value));
    }

    private static int intValue(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value instanceof Number number) return number.intValue();
        if (value == null) return 0;
        return Integer.parseInt(String.valueOf(value));
    }

    private static long longValue(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value instanceof Number number) return number.longValue();
        if (value == null) return 0L;
        return Long.parseLong(String.valueOf(value));
    }

    private static String stringValue(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        return value != null ? String.valueOf(value) : null;
    }

    private static boolean booleanValue(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value instanceof Boolean bool) return bool;
        if (value == null) return false;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private static Integer integerOrNull(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        if (value instanceof Number number) return number.intValue();
        return Integer.parseInt(String.valueOf(value));
    }

    private static Double doubleOrNull(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        if (value instanceof Number number) return number.doubleValue();
        return Double.parseDouble(String.valueOf(value));
    }

    private static Instant instant(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return Instant.now();
        return value instanceof Instant instant ? instant : Instant.parse(String.valueOf(value));
    }
}
