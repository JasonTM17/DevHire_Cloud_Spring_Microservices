package com.devhire.notification.service;

import com.devhire.common.event.ApplicationStatusChangedEvent;
import com.devhire.common.event.ApplicationSubmittedEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.notification.entity.Notification;
import com.devhire.notification.event.NotificationEventPublisher;
import com.devhire.notification.mapper.NotificationMapper;
import com.devhire.notification.repository.NotificationRepository;
import com.devhire.notification.websocket.RedisPubSubBridge;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final NotificationEventPublisher eventPublisher = mock(NotificationEventPublisher.class);
    private final NotificationSequencer notificationSequencer = mock(NotificationSequencer.class);
    private final RedisPubSubBridge redisPubSubBridge = mock(RedisPubSubBridge.class);
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final NotificationService service = new NotificationService(
            notificationRepository, new NotificationMapper(), eventPublisher,
            notificationSequencer, redisPubSubBridge, objectMapper);

    @Test
    void createsEmployerNotificationWhenApplicationSubmitted() {
        UUID employerId = UUID.randomUUID();
        when(notificationSequencer.nextSequence(anyString())).thenReturn(1L);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> persisted(invocation.getArgument(0)));

        var response = service.createForApplicationSubmitted(new ApplicationSubmittedEvent(UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), employerId, "Senior Java", Instant.now()));

        assertThat(response.recipientId()).isEqualTo(employerId);
        assertThat(response.type()).isEqualTo("APPLICATION_SUBMITTED");
        assertThat(response.read()).isFalse();
        verify(redisPubSubBridge).publishToUser(any(), any());
    }

    @Test
    void createsCandidateNotificationWhenApplicationStatusChanges() {
        UUID candidateId = UUID.randomUUID();
        when(notificationSequencer.nextSequence(anyString())).thenReturn(1L);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> persisted(invocation.getArgument(0)));

        var response = service.createForApplicationStatusChanged(new ApplicationStatusChangedEvent(UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), candidateId, UUID.randomUUID(),
                "SUBMITTED", "INTERVIEW", Instant.now()));

        assertThat(response.recipientId()).isEqualTo(candidateId);
        assertThat(response.message()).contains("INTERVIEW");
        verify(redisPubSubBridge).publishToUser(any(), any());
    }

    @Test
    void userMarksOwnNotificationAsRead() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        Notification notification = persisted(new Notification(userId, "APPLICATION_SUBMITTED", "Title", "Message"));
        ReflectionTestUtils.setField(notification, "id", notificationId);
        when(notificationRepository.findByIdAndRecipientId(notificationId, userId)).thenReturn(Optional.of(notification));

        var response = service.markRead(new AuthenticatedUser(userId, "candidate@example.com", UserRole.CANDIDATE),
                notificationId);

        assertThat(response.read()).isTrue();
        assertThat(response.readAt()).isNotNull();

        // Verify read-receipt event is published for cross-tab synchronization (requirement 5.4)
        var captor = org.mockito.ArgumentCaptor.forClass(com.devhire.notification.dto.WebSocketMessage.class);
        verify(redisPubSubBridge).publishToUser(org.mockito.ArgumentMatchers.eq(userId.toString()), captor.capture());
        var wsMessage = captor.getValue();
        assertThat(wsMessage.type()).isEqualTo("READ_RECEIPT");
        assertThat(wsMessage.destination()).isEqualTo("/user/" + userId + "/notifications");
        assertThat(wsMessage.payload()).contains(notificationId.toString());
        assertThat(wsMessage.payload()).contains("\"read\":true");
    }

    @Test
    void markReadRejectsMissingNotification() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        when(notificationRepository.findByIdAndRecipientId(notificationId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markRead(new AuthenticatedUser(userId, "candidate@example.com", UserRole.CANDIDATE),
                notificationId)).isInstanceOf(DevHireException.class)
                .hasMessageContaining("Notification not found");
    }

    @Test
    void markAllReadOnlyTouchesUnreadNotifications() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        Notification unread = persisted(new Notification(userId, "APPLICATION_SUBMITTED", "Title", "Message"));
        ReflectionTestUtils.setField(unread, "id", notificationId);
        when(notificationRepository.findByRecipientIdAndReadAtIsNull(userId)).thenReturn(List.of(unread));

        var responses = service.markAllRead(new AuthenticatedUser(userId, "candidate@example.com", UserRole.CANDIDATE));

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().read()).isTrue();

        // Verify read-receipt event is published for each notification (requirement 5.4)
        var captor = org.mockito.ArgumentCaptor.forClass(com.devhire.notification.dto.WebSocketMessage.class);
        verify(redisPubSubBridge).publishToUser(org.mockito.ArgumentMatchers.eq(userId.toString()), captor.capture());
        var wsMessage = captor.getValue();
        assertThat(wsMessage.type()).isEqualTo("READ_RECEIPT");
        assertThat(wsMessage.destination()).isEqualTo("/user/" + userId + "/notifications");
        assertThat(wsMessage.payload()).contains(notificationId.toString());
        assertThat(wsMessage.payload()).contains("\"read\":true");
    }

    @Test
    void markAllReadPublishesReadReceiptForEachNotification() {
        UUID userId = UUID.randomUUID();
        UUID notificationId1 = UUID.randomUUID();
        UUID notificationId2 = UUID.randomUUID();
        Notification unread1 = persisted(new Notification(userId, "APPLICATION_SUBMITTED", "Title1", "Message1"));
        Notification unread2 = persisted(new Notification(userId, "APPLICATION_STATUS_CHANGED", "Title2", "Message2"));
        ReflectionTestUtils.setField(unread1, "id", notificationId1);
        ReflectionTestUtils.setField(unread2, "id", notificationId2);
        when(notificationRepository.findByRecipientIdAndReadAtIsNull(userId)).thenReturn(List.of(unread1, unread2));

        var responses = service.markAllRead(new AuthenticatedUser(userId, "candidate@example.com", UserRole.CANDIDATE));

        assertThat(responses).hasSize(2);

        // Verify a read-receipt is published for each notification
        var captor = org.mockito.ArgumentCaptor.forClass(com.devhire.notification.dto.WebSocketMessage.class);
        verify(redisPubSubBridge, org.mockito.Mockito.times(2))
                .publishToUser(org.mockito.ArgumentMatchers.eq(userId.toString()), captor.capture());

        var messages = captor.getAllValues();
        assertThat(messages).hasSize(2);
        assertThat(messages).allSatisfy(msg -> {
            assertThat(msg.type()).isEqualTo("READ_RECEIPT");
            assertThat(msg.destination()).isEqualTo("/user/" + userId + "/notifications");
            assertThat(msg.payload()).contains("\"read\":true");
        });
        // Verify both notification IDs are covered
        var allPayloads = messages.stream().map(com.devhire.notification.dto.WebSocketMessage::payload).toList();
        assertThat(allPayloads).anySatisfy(p -> assertThat(p).contains(notificationId1.toString()));
        assertThat(allPayloads).anySatisfy(p -> assertThat(p).contains(notificationId2.toString()));
    }

    @Test
    void webSocketDeliveryIncludesSequenceNumberAndAllRequiredFields() {
        UUID employerId = UUID.randomUUID();
        when(notificationSequencer.nextSequence(employerId.toString())).thenReturn(42L);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> persisted(invocation.getArgument(0)));

        service.createForApplicationSubmitted(new ApplicationSubmittedEvent(UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), employerId, "Backend Dev", Instant.now()));

        var captor = org.mockito.ArgumentCaptor.forClass(com.devhire.notification.dto.WebSocketMessage.class);
        verify(redisPubSubBridge).publishToUser(any(), captor.capture());

        var wsMessage = captor.getValue();
        assertThat(wsMessage.type()).isEqualTo("NOTIFICATION");
        assertThat(wsMessage.destination()).isEqualTo("/user/" + employerId + "/notifications");

        // Verify payload contains all required fields
        assertThat(wsMessage.payload()).contains("\"id\"");
        assertThat(wsMessage.payload()).contains("\"type\"");
        assertThat(wsMessage.payload()).contains("\"title\"");
        assertThat(wsMessage.payload()).contains("\"body\"");
        assertThat(wsMessage.payload()).contains("\"createdAt\"");
        assertThat(wsMessage.payload()).contains("\"read\"");
        assertThat(wsMessage.payload()).contains("\"sequenceNumber\"");
        assertThat(wsMessage.payload()).contains("42");
    }

    @Test
    void webSocketDeliveryIsPersistedBeforePublishing() {
        UUID candidateId = UUID.randomUUID();
        when(notificationSequencer.nextSequence(anyString())).thenReturn(5L);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            // Verify sequence number is set before save
            assertThat(n.getSequenceNumber()).isEqualTo(5L);
            return persisted(n);
        });

        service.createForApplicationStatusChanged(new ApplicationStatusChangedEvent(UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), candidateId, UUID.randomUUID(),
                "SUBMITTED", "REVIEW", Instant.now()));

        // Verify save was called before publish (save is mocked, publish happens after)
        var inOrder = org.mockito.Mockito.inOrder(notificationRepository, redisPubSubBridge);
        inOrder.verify(notificationRepository).save(any(Notification.class));
        inOrder.verify(redisPubSubBridge).publishToUser(any(), any());
    }

    private static Notification persisted(Notification notification) {
        ReflectionTestUtils.setField(notification, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(notification, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(notification, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        return notification;
    }
}
