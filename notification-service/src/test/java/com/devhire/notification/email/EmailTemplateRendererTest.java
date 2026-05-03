package com.devhire.notification.email;

import com.devhire.notification.config.EmailProperties;
import com.devhire.notification.entity.Notification;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EmailTemplateRendererTest {
    @Test
    void rendersEscapedHtmlAndPlainTextFallback() {
        EmailTemplateRenderer renderer = new EmailTemplateRenderer(
                new EmailProperties(true, "no-reply@devhire.local", null, "https://devhire.example.com",
                        25, 5, 30, 900, 60)
        );
        Notification notification = new Notification(UUID.randomUUID(), "APPLICATION_STATUS_CHANGED",
                "Status <updated>", "Your application moved to <INTERVIEW>");

        EmailMessage message = renderer.render(notification, "candidate@example.com");

        assertThat(message.recipient()).isEqualTo("candidate@example.com");
        assertThat(message.subject()).contains("Status <updated>");
        assertThat(message.htmlBody()).contains("Status &lt;updated&gt;");
        assertThat(message.htmlBody()).contains("https://devhire.example.com/notifications");
        assertThat(message.textBody()).contains("Your application moved to <INTERVIEW>");
    }
}
