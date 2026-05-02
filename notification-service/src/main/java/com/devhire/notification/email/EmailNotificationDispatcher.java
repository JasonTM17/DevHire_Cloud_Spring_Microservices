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

    public EmailNotificationDispatcher(EmailProperties properties,
                                       UserClient userClient,
                                       EmailDeliveryService emailDeliveryService) {
        this.properties = properties;
        this.userClient = userClient;
        this.emailDeliveryService = emailDeliveryService;
    }

    public void dispatch(Notification notification) {
        if (!properties.enabled()) {
            notification.markEmailDisabled();
            return;
        }
        String recipient = resolveEmail(notification);
        if (recipient == null || recipient.isBlank()) {
            notification.markEmailSkippedNoAddress();
            return;
        }
        EmailDeliveryResult result = emailDeliveryService.send(message(notification, recipient));
        if (result.sent()) {
            notification.markEmailSent(recipient, result.providerMessageId());
            return;
        }
        notification.markEmailFailed(recipient, result.failureReason());
    }

    private String resolveEmail(Notification notification) {
        try {
            ApiResponse<ProfileResponse> response = userClient.getProfile(notification.getRecipientId());
            return response == null || response.data() == null ? null : response.data().email();
        } catch (FeignException.NotFound ex) {
            log.warn("notification_email_recipient_missing recipientId={}", notification.getRecipientId());
            return null;
        } catch (RuntimeException ex) {
            log.warn("notification_email_recipient_lookup_failed recipientId={} message={}",
                    notification.getRecipientId(), ex.getMessage());
            return null;
        }
    }

    private EmailMessage message(Notification notification, String recipient) {
        String ctaUrl = properties.dashboardBaseUrl() + "/api/notifications";
        String html = """
                <html>
                  <body style="font-family:Arial,sans-serif;color:#17202a">
                    <h2>%s</h2>
                    <p>%s</p>
                    <p><a href="%s">Open DevHire Cloud notifications</a></p>
                  </body>
                </html>
                """.formatted(escape(notification.getTitle()), escape(notification.getMessage()), ctaUrl);
        String text = notification.getTitle() + System.lineSeparator()
                + notification.getMessage() + System.lineSeparator()
                + ctaUrl;
        return new EmailMessage(recipient, "[DevHire Cloud] " + notification.getTitle(), html, text);
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
