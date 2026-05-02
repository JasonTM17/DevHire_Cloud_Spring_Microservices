package com.devhire.notification.service;

import com.devhire.common.event.ApplicationStatusChangedEvent;
import com.devhire.common.event.ApplicationSubmittedEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.notification.entity.Notification;
import com.devhire.notification.email.EmailNotificationDispatcher;
import com.devhire.notification.event.NotificationEventPublisher;
import com.devhire.notification.mapper.NotificationMapper;
import com.devhire.notification.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NotificationServiceTest {
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final NotificationEventPublisher eventPublisher = mock(NotificationEventPublisher.class);
    private final EmailNotificationDispatcher emailDispatcher = mock(EmailNotificationDispatcher.class);
    private final NotificationService service = new NotificationService(
            notificationRepository, new NotificationMapper(), eventPublisher, emailDispatcher);

    @Test
    void createsEmployerNotificationWhenApplicationSubmitted() {
        UUID employerId = UUID.randomUUID();
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> persisted(invocation.getArgument(0)));

        var response = service.createForApplicationSubmitted(new ApplicationSubmittedEvent(UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), employerId, "Senior Java", Instant.now()));

        assertThat(response.recipientId()).isEqualTo(employerId);
        assertThat(response.type()).isEqualTo("APPLICATION_SUBMITTED");
        assertThat(response.read()).isFalse();
    }

    @Test
    void createsCandidateNotificationWhenApplicationStatusChanges() {
        UUID candidateId = UUID.randomUUID();
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> persisted(invocation.getArgument(0)));

        var response = service.createForApplicationStatusChanged(new ApplicationStatusChangedEvent(UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), candidateId, UUID.randomUUID(),
                "SUBMITTED", "INTERVIEW", Instant.now()));

        assertThat(response.recipientId()).isEqualTo(candidateId);
        assertThat(response.message()).contains("INTERVIEW");
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
        Notification unread = persisted(new Notification(userId, "APPLICATION_SUBMITTED", "Title", "Message"));
        when(notificationRepository.findByRecipientIdAndReadAtIsNull(userId)).thenReturn(List.of(unread));

        var responses = service.markAllRead(new AuthenticatedUser(userId, "candidate@example.com", UserRole.CANDIDATE));

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().read()).isTrue();
    }

    private static Notification persisted(Notification notification) {
        ReflectionTestUtils.setField(notification, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(notification, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(notification, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        return notification;
    }
}
