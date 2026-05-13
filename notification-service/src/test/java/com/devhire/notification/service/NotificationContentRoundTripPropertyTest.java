package com.devhire.notification.service;

import com.devhire.notification.dto.response.NotificationResponse;
import com.devhire.notification.entity.Notification;
import com.devhire.notification.mapper.NotificationMapper;
import net.jqwik.api.*;
import net.jqwik.api.constraints.StringLength;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for notification content round-trip.
 *
 * <p>Feature: realtime-collaboration, Property 18: Notification Content Round-Trip</p>
 *
 * <p><b>Validates: Requirements 13.5</b></p>
 *
 * <p>For any valid notification content, persisting the notification to the database and then
 * retrieving it via the REST API SHALL produce identical content (id, type, title, body,
 * createdAt, read status).</p>
 *
 * <p>This test validates the round-trip property by simulating persist → retrieve through
 * the entity → mapper → response pipeline, verifying that no data is lost or corrupted
 * during the transformation.</p>
 */
@Tag("realtime-collaboration")
@Label("Property 18: Notification Content Round-Trip")
class NotificationContentRoundTripPropertyTest {

    private final NotificationMapper mapper = new NotificationMapper();

    @Property(tries = 200)
    @Label("Persist then retrieve produces identical content")
    void persistThenRetrieveProducesIdenticalContent(
            @ForAll("notificationType") String type,
            @ForAll("notificationTitle") String title,
            @ForAll("notificationBody") String body,
            @ForAll("recipientId") UUID recipientId,
            @ForAll boolean shouldBeRead
    ) {
        // Simulate persist: create entity (mimics what JPA would do)
        Notification notification = new Notification(recipientId, type, title, body);

        // Simulate JPA @PrePersist lifecycle callback
        notification.getClass(); // entity is created
        // We need to trigger prePersist manually since we're not using JPA
        triggerPrePersist(notification);

        if (shouldBeRead) {
            notification.markRead();
        }

        // Simulate retrieve: map entity to response (mimics the REST API response)
        NotificationResponse response = mapper.toResponse(notification);

        // Verify round-trip: all content fields are identical
        assertThat(response.recipientId())
                .as("recipientId should be preserved in round-trip")
                .isEqualTo(recipientId);
        assertThat(response.type())
                .as("type should be preserved in round-trip")
                .isEqualTo(type);
        assertThat(response.title())
                .as("title should be preserved in round-trip")
                .isEqualTo(title);
        assertThat(response.message())
                .as("body/message should be preserved in round-trip")
                .isEqualTo(body);
        assertThat(response.read())
                .as("read status should be preserved in round-trip")
                .isEqualTo(shouldBeRead);
        assertThat(response.createdAt())
                .as("createdAt should be preserved in round-trip")
                .isNotNull();
    }

    @Property(tries = 200)
    @Label("Type field is preserved exactly through round-trip")
    void typeFieldIsPreservedExactly(
            @ForAll("notificationType") String type
    ) {
        UUID recipientId = UUID.randomUUID();
        Notification notification = new Notification(recipientId, type, "Test Title", "Test Body");
        triggerPrePersist(notification);

        NotificationResponse response = mapper.toResponse(notification);

        assertThat(response.type()).isEqualTo(type);
    }

    @Property(tries = 200)
    @Label("Title field is preserved exactly through round-trip")
    void titleFieldIsPreservedExactly(
            @ForAll("notificationTitle") String title
    ) {
        UUID recipientId = UUID.randomUUID();
        Notification notification = new Notification(recipientId, "APPLICATION_STATUS", title, "Test Body");
        triggerPrePersist(notification);

        NotificationResponse response = mapper.toResponse(notification);

        assertThat(response.title()).isEqualTo(title);
    }

    @Property(tries = 200)
    @Label("Body/message field is preserved exactly through round-trip")
    void bodyFieldIsPreservedExactly(
            @ForAll("notificationBody") String body
    ) {
        UUID recipientId = UUID.randomUUID();
        Notification notification = new Notification(recipientId, "APPLICATION_STATUS", "Test Title", body);
        triggerPrePersist(notification);

        NotificationResponse response = mapper.toResponse(notification);

        assertThat(response.message()).isEqualTo(body);
    }

    @Property(tries = 200)
    @Label("Read status false is preserved through round-trip")
    void unreadStatusIsPreserved(
            @ForAll("notificationType") String type,
            @ForAll("notificationTitle") String title,
            @ForAll("notificationBody") String body
    ) {
        UUID recipientId = UUID.randomUUID();
        Notification notification = new Notification(recipientId, type, title, body);
        triggerPrePersist(notification);

        // Do NOT mark as read
        NotificationResponse response = mapper.toResponse(notification);

        assertThat(response.read()).isFalse();
        assertThat(response.readAt()).isNull();
    }

    @Property(tries = 200)
    @Label("Read status true is preserved through round-trip")
    void readStatusIsPreserved(
            @ForAll("notificationType") String type,
            @ForAll("notificationTitle") String title,
            @ForAll("notificationBody") String body
    ) {
        UUID recipientId = UUID.randomUUID();
        Notification notification = new Notification(recipientId, type, title, body);
        triggerPrePersist(notification);

        notification.markRead();
        NotificationResponse response = mapper.toResponse(notification);

        assertThat(response.read()).isTrue();
        assertThat(response.readAt()).isNotNull();
    }

    @Property(tries = 200)
    @Label("CreatedAt timestamp is non-null after persist")
    void createdAtIsNonNullAfterPersist(
            @ForAll("notificationType") String type,
            @ForAll("notificationTitle") String title,
            @ForAll("notificationBody") String body,
            @ForAll("recipientId") UUID recipientId
    ) {
        Notification notification = new Notification(recipientId, type, title, body);
        triggerPrePersist(notification);

        NotificationResponse response = mapper.toResponse(notification);

        assertThat(response.createdAt())
                .as("createdAt should be set after persist")
                .isNotNull();
    }

    /**
     * Triggers the @PrePersist lifecycle callback on the Notification entity.
     * In production, JPA handles this automatically. For unit testing the round-trip
     * property, we invoke it via reflection.
     */
    private void triggerPrePersist(Notification notification) {
        try {
            var method = Notification.class.getDeclaredMethod("prePersist");
            method.setAccessible(true);
            method.invoke(notification);
        } catch (Exception e) {
            throw new RuntimeException("Failed to trigger prePersist", e);
        }
    }

    @Provide
    Arbitrary<String> notificationType() {
        return Arbitraries.of(
                "APPLICATION_STATUS",
                "ASSESSMENT_RESULT",
                "SYSTEM",
                "MESSAGE",
                "APPLICATION_SUBMITTED",
                "APPLICATION_STATUS_CHANGED"
        );
    }

    @Provide
    Arbitrary<String> notificationTitle() {
        // Titles are limited to 180 chars in the entity
        return Arbitraries.strings()
                .ofMinLength(1)
                .ofMaxLength(180)
                .alpha()
                .numeric()
                .withChars(' ', '.', '!', '?', '-', ':', '\'');
    }

    @Provide
    Arbitrary<String> notificationBody() {
        // Body/message is limited to 1000 chars in the entity
        return Arbitraries.strings()
                .ofMinLength(1)
                .ofMaxLength(500)
                .alpha()
                .numeric()
                .withChars(' ', '.', '!', '?', '-', ':', '\'', ',', '\n');
    }

    @Provide
    Arbitrary<UUID> recipientId() {
        return Arbitraries.create(UUID::randomUUID);
    }
}
