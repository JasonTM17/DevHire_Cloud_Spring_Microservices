package com.devhire.notification.email;

import com.devhire.common.ApiResponse;
import com.devhire.common.security.UserRole;
import com.devhire.notification.client.UserClient;
import com.devhire.notification.client.dto.ProfileResponse;
import com.devhire.notification.config.EmailProperties;
import com.devhire.notification.entity.EmailStatus;
import com.devhire.notification.entity.Notification;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailNotificationDispatcherTest {
    private final UserClient userClient = mock(UserClient.class);
    private final EmailDeliveryService emailDeliveryService = mock(EmailDeliveryService.class);

    @Test
    void disabledEmailMarksNotificationWithoutCallingProvider() {
        var dispatcher = new EmailNotificationDispatcher(
                new EmailProperties(false, "no-reply@devhire.local", null, "http://localhost:8080"),
                userClient,
                emailDeliveryService);
        Notification notification = new Notification(UUID.randomUUID(), "APPLICATION_SUBMITTED", "Title", "Message");

        dispatcher.dispatch(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.DISABLED);
    }

    @Test
    void enabledEmailResolvesRecipientAndSendsSmtpMessage() {
        UUID userId = UUID.randomUUID();
        var dispatcher = new EmailNotificationDispatcher(
                new EmailProperties(true, "no-reply@devhire.local", null, "http://localhost:8080"),
                userClient,
                emailDeliveryService);
        when(userClient.getProfile(userId)).thenReturn(ApiResponse.ok(
                new ProfileResponse(userId, "candidate@example.com", UserRole.CANDIDATE, "Candidate")));
        when(emailDeliveryService.send(argThat(message -> message.recipient().equals("candidate@example.com"))))
                .thenReturn(EmailDeliveryResult.sent("smtp-message-id"));
        Notification notification = new Notification(userId, "APPLICATION_STATUS_CHANGED", "Status", "Updated");

        dispatcher.dispatch(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.SENT);
        assertThat(notification.getEmailRecipient()).isEqualTo("candidate@example.com");
        assertThat(notification.getEmailProviderMessageId()).isEqualTo("smtp-message-id");
        assertThat(notification.getEmailSentAt()).isNotNull();
        verify(emailDeliveryService).send(argThat(message -> message.subject().contains("DevHire Cloud")));
    }

    @Test
    void failedProviderMarksFailureWithoutBreakingNotificationCreation() {
        UUID userId = UUID.randomUUID();
        var dispatcher = new EmailNotificationDispatcher(
                new EmailProperties(true, "no-reply@devhire.local", null, "http://localhost:8080"),
                userClient,
                emailDeliveryService);
        when(userClient.getProfile(userId)).thenReturn(ApiResponse.ok(
                new ProfileResponse(userId, "candidate@example.com", UserRole.CANDIDATE, "Candidate")));
        when(emailDeliveryService.send(argThat(message -> message.recipient().equals("candidate@example.com"))))
                .thenReturn(EmailDeliveryResult.failed("smtp unavailable"));
        Notification notification = new Notification(userId, "APPLICATION_STATUS_CHANGED", "Status", "Updated");

        dispatcher.dispatch(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.FAILED);
        assertThat(notification.getEmailFailureReason()).contains("smtp unavailable");
    }
}
