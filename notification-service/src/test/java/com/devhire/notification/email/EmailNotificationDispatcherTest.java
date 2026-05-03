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
        EmailProperties properties = properties(false);
        var dispatcher = dispatcher(properties);
        Notification notification = new Notification(UUID.randomUUID(), "APPLICATION_SUBMITTED", "Title", "Message");

        dispatcher.dispatch(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.DISABLED);
    }

    @Test
    void enabledEmailResolvesRecipientAndSendsSmtpMessage() {
        UUID userId = UUID.randomUUID();
        EmailProperties properties = properties(true);
        var dispatcher = dispatcher(properties);
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
    void retryableProviderFailureSchedulesAnotherAttempt() {
        UUID userId = UUID.randomUUID();
        EmailProperties properties = properties(true);
        var dispatcher = dispatcher(properties);
        when(userClient.getProfile(userId)).thenReturn(ApiResponse.ok(
                new ProfileResponse(userId, "candidate@example.com", UserRole.CANDIDATE, "Candidate")));
        when(emailDeliveryService.send(argThat(message -> message.recipient().equals("candidate@example.com"))))
                .thenReturn(EmailDeliveryResult.failedRetryable("smtp unavailable"));
        Notification notification = new Notification(userId, "APPLICATION_STATUS_CHANGED", "Status", "Updated");

        dispatcher.dispatch(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.FAILED_RETRYABLE);
        assertThat(notification.getEmailFailureReason()).contains("smtp unavailable");
        assertThat(notification.getEmailAttempts()).isEqualTo(1);
        assertThat(notification.getEmailNextAttemptAt()).isNotNull();
    }

    private EmailNotificationDispatcher dispatcher(EmailProperties properties) {
        return new EmailNotificationDispatcher(properties, userClient, emailDeliveryService,
                new EmailRetryPolicy(properties), new EmailTemplateRenderer(properties));
    }

    private static EmailProperties properties(boolean enabled) {
        return new EmailProperties(enabled, "no-reply@devhire.local", null, "http://localhost:8080",
                25, 5, 30, 900, 60);
    }
}
