package com.devhire.notification.properties;

import com.devhire.notification.dto.AssessmentProgressPayload;
import com.devhire.notification.dto.NotificationWebSocketPayload;
import com.devhire.notification.dto.RankChangeEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import net.jqwik.api.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Domain Event Serialization Completeness.
 *
 * <p>Feature: realtime-collaboration, Property 5: Domain Event Serialization Completeness</p>
 *
 * <p><b>Validates: Requirements 4.3, 6.2, 7.2</b></p>
 *
 * <p>For any notification, progress, or rank-change event, serialized payloads
 * contain all required fields.</p>
 */
@Label("Feature: realtime-collaboration, Property 5: Domain Event Serialization Completeness")
@Tag("realtime-collaboration")
@Tag("property-test")
class DomainEventSerializationPropertyTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    private static final List<String> NOTIFICATION_TYPES = List.of(
            "APPLICATION_STATUS", "ASSESSMENT_RESULT", "SYSTEM", "MESSAGE"
    );

    private static final List<String> PROGRESS_STATUSES = List.of(
            "passed", "failed", "running"
    );

    /**
     * Property 5a: For any notification event, the serialized payload SHALL contain
     * all required fields: id, type, title, body, createdAt, read, sequenceNumber.
     */
    @Property(tries = 150)
    void notificationPayloadContainsAllRequiredFields(
            @ForAll("notificationPayloads") NotificationWebSocketPayload payload
    ) throws Exception {
        String json = OBJECT_MAPPER.writeValueAsString(payload);
        JsonNode node = OBJECT_MAPPER.readTree(json);

        assertThat(node.has("id")).as("notification must have 'id' field").isTrue();
        assertThat(node.has("type")).as("notification must have 'type' field").isTrue();
        assertThat(node.has("title")).as("notification must have 'title' field").isTrue();
        assertThat(node.has("body")).as("notification must have 'body' field").isTrue();
        assertThat(node.has("createdAt")).as("notification must have 'createdAt' field").isTrue();
        assertThat(node.has("read")).as("notification must have 'read' field").isTrue();
        assertThat(node.has("sequenceNumber")).as("notification must have 'sequenceNumber' field").isTrue();

        // Verify values are non-null
        assertThat(node.get("id").isNull()).isFalse();
        assertThat(node.get("type").isNull()).isFalse();
        assertThat(node.get("title").isNull()).isFalse();
        assertThat(node.get("body").isNull()).isFalse();
        assertThat(node.get("createdAt").isNull()).isFalse();
    }

    /**
     * Property 5b: For any assessment progress event, the serialized payload SHALL contain
     * all required fields: testCaseIndex, totalTestCases, status, executionTimeMs.
     */
    @Property(tries = 150)
    void assessmentProgressPayloadContainsAllRequiredFields(
            @ForAll("progressPayloads") AssessmentProgressPayload payload
    ) throws Exception {
        String json = OBJECT_MAPPER.writeValueAsString(payload);
        JsonNode node = OBJECT_MAPPER.readTree(json);

        assertThat(node.has("assessmentId")).as("progress must have 'assessmentId' field").isTrue();
        assertThat(node.has("testCaseIndex")).as("progress must have 'testCaseIndex' field").isTrue();
        assertThat(node.has("totalTestCases")).as("progress must have 'totalTestCases' field").isTrue();
        assertThat(node.has("status")).as("progress must have 'status' field").isTrue();
        assertThat(node.has("executionTimeMs")).as("progress must have 'executionTimeMs' field").isTrue();

        // Verify values are non-null
        assertThat(node.get("assessmentId").isNull()).isFalse();
        assertThat(node.get("status").isNull()).isFalse();
    }

    /**
     * Property 5c: For any rank-change event, the serialized payload SHALL contain
     * all required fields: candidateId, newRank, previousRank, score, assessmentId.
     */
    @Property(tries = 150)
    void rankChangePayloadContainsAllRequiredFields(
            @ForAll("rankChangeEvents") RankChangeEvent event
    ) throws Exception {
        String json = OBJECT_MAPPER.writeValueAsString(event);
        JsonNode node = OBJECT_MAPPER.readTree(json);

        assertThat(node.has("candidateId")).as("rank-change must have 'candidateId' field").isTrue();
        assertThat(node.has("newRank")).as("rank-change must have 'newRank' field").isTrue();
        assertThat(node.has("previousRank")).as("rank-change must have 'previousRank' field").isTrue();
        assertThat(node.has("score")).as("rank-change must have 'score' field").isTrue();
        assertThat(node.has("assessmentId")).as("rank-change must have 'assessmentId' field").isTrue();

        // Verify values are non-null
        assertThat(node.get("candidateId").isNull()).isFalse();
        assertThat(node.get("assessmentId").isNull()).isFalse();
    }

    @Provide
    Arbitrary<NotificationWebSocketPayload> notificationPayloads() {
        Arbitrary<UUID> ids = Arbitraries.create(UUID::randomUUID);
        Arbitrary<String> types = Arbitraries.of(NOTIFICATION_TYPES);
        Arbitrary<String> titles = Arbitraries.strings().ofMinLength(1).ofMaxLength(100).alpha();
        Arbitrary<String> bodies = Arbitraries.strings().ofMinLength(1).ofMaxLength(500).alpha();
        Arbitrary<Instant> timestamps = Arbitraries.longs()
                .between(Instant.parse("2020-01-01T00:00:00Z").getEpochSecond(),
                        Instant.parse("2030-01-01T00:00:00Z").getEpochSecond())
                .map(Instant::ofEpochSecond);
        Arbitrary<Boolean> readFlags = Arbitraries.of(true, false);
        Arbitrary<Long> sequenceNumbers = Arbitraries.longs().between(1, Long.MAX_VALUE);

        return Combinators.combine(ids, types, titles, bodies, timestamps, readFlags, sequenceNumbers)
                .as(NotificationWebSocketPayload::new);
    }

    @Provide
    Arbitrary<AssessmentProgressPayload> progressPayloads() {
        Arbitrary<String> assessmentIds = Arbitraries.create(() -> UUID.randomUUID().toString());
        Arbitrary<Integer> totalTestCases = Arbitraries.integers().between(1, 100);

        return totalTestCases.flatMap(total -> {
            Arbitrary<Integer> testCaseIndex = Arbitraries.integers().between(0, total - 1);
            Arbitrary<String> statuses = Arbitraries.of(PROGRESS_STATUSES);
            Arbitrary<Long> executionTimes = Arbitraries.longs().between(1, 60_000);
            Arbitrary<String> errorOutputs = Arbitraries.of(
                    (String) null, "AssertionError: expected 5 but got 3", "TimeoutException"
            );

            return Combinators.combine(assessmentIds, testCaseIndex, Arbitraries.just(total), statuses, executionTimes, errorOutputs)
                    .as(AssessmentProgressPayload::new);
        });
    }

    @Provide
    Arbitrary<RankChangeEvent> rankChangeEvents() {
        Arbitrary<String> candidateIds = Arbitraries.create(() -> UUID.randomUUID().toString());
        Arbitrary<Integer> ranks = Arbitraries.integers().between(1, 10_000);
        Arbitrary<Double> scores = Arbitraries.doubles().between(0.0, 100.0);
        Arbitrary<String> assessmentIds = Arbitraries.create(() -> UUID.randomUUID().toString());

        return Combinators.combine(candidateIds, ranks, ranks, scores, assessmentIds)
                .as(RankChangeEvent::new);
    }
}
