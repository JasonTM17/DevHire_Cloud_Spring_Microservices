package com.devhire.notification.email;

import com.devhire.common.ApiResponse;
import com.devhire.notification.client.UserClient;
import com.devhire.notification.client.dto.ProfileResponse;
import com.devhire.notification.config.EmailProperties;
import com.devhire.notification.entity.Notification;
import feign.FeignException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class EmailNotificationDispatcher {
    private static final Logger log = LoggerFactory.getLogger(EmailNotificationDispatcher.class);

    private final EmailProperties properties;
    private final UserClient userClient;
    private final EmailDeliveryService emailDeliveryService;
    private final EmailRetryPolicy retryPolicy;
    private final EmailTemplateRenderer templateRenderer;

    public EmailNotificationDispatcher(EmailProperties properties,
                                       UserClient userClient,
                                       EmailDeliveryService emailDeliveryService,
                                       EmailRetryPolicy retryPolicy,
                                       EmailTemplateRenderer templateRenderer) {
        this.properties = properties;
        this.userClient = userClient;
        this.emailDeliveryService = emailDeliveryService;
        this.retryPolicy = retryPolicy;
        this.templateRenderer = templateRenderer;
    }

    public void dispatch(Notification notification) {
        if (!properties.enabled()) {
            notification.markEmailDisabled();
            return;
        }
        notification.markEmailSending(notification.getEmailRecipient());
        ResolvedEmail resolvedEmail = resolveEmail(notification);
        if (resolvedEmail.retryableFailure()) {
            markFailure(notification, null, resolvedEmail.failureReason(), true);
            return;
        }
        String recipient = resolvedEmail.email();
        if (recipient == null || recipient.isBlank()) {
            notification.markEmailSkippedNoAddress();
            return;
        }
        EmailDeliveryResult result = emailDeliveryService.send(templateRenderer.render(notification, recipient));
        if (result.sent()) {
            notification.markEmailSent(recipient, result.providerMessageId());
            return;
        }
        markFailure(notification, recipient, result.failureReason(), result.retryable());
    }

    private ResolvedEmail resolveEmail(Notification notification) {
        try {
            ApiResponse<ProfileResponse> response = userClient.getProfile(notification.getRecipientId());
            return ResolvedEmail.resolved(response == null || response.data() == null ? null : response.data().email());
        } catch (FeignException.NotFound ex) {
            log.warn("notification_email_recipient_missing recipientId={}", notification.getRecipientId());
            return ResolvedEmail.permanent("Recipient email was not available");
        } catch (RuntimeException ex) {
            log.warn("notification_email_recipient_lookup_failed recipientId={} message={}",
                    notification.getRecipientId(), ex.getMessage());
            return ResolvedEmail.retryable(ex.getMessage() == null ? "Recipient lookup failed" : ex.getMessage());
        }
    }

    private void markFailure(Notification notification, String recipient, String reason, boolean retryable) {
        if (retryable && retryPolicy.canRetry(notification.getEmailAttempts())) {
            notification.markEmailRetryableFailure(recipient, reason,
                    retryPolicy.nextAttemptAt(notification.getEmailAttempts(), java.time.Instant.now()));
            return;
        }
        notification.markEmailPermanentFailure(recipient, reason);
    }

    private record ResolvedEmail(String email, String failureReason, boolean retryableFailure) {
        static ResolvedEmail resolved(String email) {
            return new ResolvedEmail(email, null, false);
        }

        static ResolvedEmail retryable(String reason) {
            return new ResolvedEmail(null, reason, true);
        }

        static ResolvedEmail permanent(String reason) {
            return new ResolvedEmail(null, reason, false);
        }
    }
}
