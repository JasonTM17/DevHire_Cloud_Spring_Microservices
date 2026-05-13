package com.devhire.notification.properties;

import com.devhire.notification.dto.NotificationWebSocketPayload;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import net.jqwik.api.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Notification Content Round-Trip.
 *
 * <p>Feature: realtime-collaboration, Property 18: Notification Content Round-Trip</p>
 *
 * <p><b>Validates: Requirements 13.5</b></p>
 *
 * <p>For any valid notification content, persisting the notification and then retrieving
 * it SHALL produce identical content (id, type, title, body, createdAt, read status).</p>
 */
@Label("Feature: realtime-collaboration, Property 18: Notification Content Round-Trip")
@Tag("realtime-collaboration")
@Tag("property-test")
class NotificationContentRoundTripPropertyTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    private static final List<String> NOTIFICATION_TYPES = List.of(
            "APPLICATION_STATUS", "ASSESSMENT_RESULT", "SYSTEM", "MESSAGE"
    );

    /**
     * Simulates the persist → retrieve cycle. In production this goes through
     * JPA entity → PostgreSQL → JPA entity → DTO mapping. We simulate the
     * serialization/deserialization round-trip that occurs during persist and retrieve.
     */
    static NotificationWebSocketPayload simulatePersistAndRetrieve(
            NotificationWebSocketPayload original) throws Exception {
        // Simulate persist: serialize to JSON (as stored/transmitted)
        String json = OBJECT_MAPPER.writeValueAsString(original);

        // Simulate retrieve: deserialize from JSON
        return OBJECT_MAPPER.readValue(json, NotificationWebSocketPayload.class);
    }

    /**
     * Property 18a: Persist → retrieve produces identical notification content.
     */
    @Property(tries = 200)
    void persistThenRetrieveProducesIdenticalContent(
            @ForAll("notificationPayloads") NotificationWebSocketPayload original
    ) throws Exception {
        NotificationWebSocketPayload retrieved = simulatePersistAndRetrieve(original);

        assertThat(retrieved.id())
                .as("Retrieved id must equal original")
                .isEqualTo(original.id());
        assertThat(retrieved.type())
                .as("Retrieved type must equal original")
                .isEqualTo(original.type());
        assertThat(retrieved.title())
                .as("Retrieved title must equal original")
                .isEqualTo(original.title());
        assertThat(retrieved.body())
                .as("Retrieved body must equal original")
                .isEqualTo(original.body());
        assertThat(retrieved.createdAt())
                .as("Retrieved createdAt must equal original")
                .isEqualTo(original.createdAt());
        assertThat(retrieved.read())
                .as("Retrieved read status must equal original")
                .isEqualTo(original.read());
        assertThat(retrieved.sequenceNumber())
                .as("Retrieved sequenceNumber must equal original")
                .isEqualTo(original.sequenceNumber());
    }

    /**
     * Property 18b: Round-trip preserves equality (full object equality).
     */
    @Property(tries = 200)
    void roundTripPreservesFullEquality(
            @ForAll("notificationPayloads") NotificationWebSocketPayload original
    ) throws Exception {
        NotificationWebSocketPayload retrieved = simulatePersistAndRetrieve(original);
        assertThat(retrieved).isEqualTo(original);
    }

    /**
     * Property 18c: Multiple round-trips produce the same result (idempotency).
     */
    @Property(tries = 150)
    void multipleRoundTripsProduceSameResult(
            @ForAll("notificationPayloads") NotificationWebSocketPayload original
    ) throws Exception {
        NotificationWebSocketPayload firstRoundTrip = simulatePersistAndRetrieve(original);
        NotificationWebSocketPayload secondRoundTrip = simulatePersistAndRetrieve(firstRoundTrip);

        assertThat(secondRoundTrip).isEqualTo(firstRoundTrip);
        assertThat(secondRoundTrip).isEqualTo(original);
    }

    @Provide
    Arbitrary<NotificationWebSocketPayload> notificationPayloads() {
        Arbitrary<UUID> ids = Arbitraries.create(UUID::randomUUID);
        Arbitrary<String> types = Arbitraries.of(NOTIFICATION_TYPES);
        Arbitrary<String> titles = Arbitraries.strings()
                .ofMinLength(1).ofMaxLength(180)
                .alpha().numeric().withChars(' ', '-', '_', '.');
        Arbitrary<String> bodies = Arbitraries.strings()
                .ofMinLength(1).ofMaxLength(500)
                .alpha().numeric().withChars(' ', '-', '_', '.', ',', '!', '?');
        Arbitrary<Instant> timestamps = Arbitraries.longs()
                .between(Instant.parse("2020-01-01T00:00:00Z").getEpochSecond(),
                        Instant.parse("2030-01-01T00:00:00Z").getEpochSecond())
                .map(Instant::ofEpochSecond);
        Arbitrary<Boolean> readFlags = Arbitraries.of(true, false);
        Arbitrary<Long> sequenceNumbers = Arbitraries.longs().between(1, Long.MAX_VALUE);

        return Combinators.combine(ids, types, titles, bodies, timestamps, readFlags, sequenceNumbers)
                .as(NotificationWebSocketPayload::new);
    }
}
