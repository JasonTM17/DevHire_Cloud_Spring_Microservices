package com.devhire.notification.email;

import com.devhire.notification.config.EmailProperties;
import jakarta.mail.internet.MimeMessage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
@ConditionalOnProperty(prefix = "devhire.notification.email", name = "enabled", havingValue = "true")
public class SmtpEmailDeliveryService implements EmailDeliveryService {
    private final JavaMailSender mailSender;
    private final EmailProperties properties;

    public SmtpEmailDeliveryService(JavaMailSender mailSender, EmailProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Override
    public EmailDeliveryResult send(EmailMessage message) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(properties.from());
            if (properties.replyTo() != null && !properties.replyTo().isBlank()) {
                helper.setReplyTo(properties.replyTo());
            }
            helper.setTo(message.recipient());
            helper.setSubject(message.subject());
            helper.setText(message.textBody(), message.htmlBody());
            mailSender.send(mimeMessage);
            return EmailDeliveryResult.sent(mimeMessage.getMessageID());
        } catch (Exception ex) {
            return EmailDeliveryResult.failed(ex.getMessage());
        }
    }
}
