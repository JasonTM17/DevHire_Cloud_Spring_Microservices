package com.devhire.notification.email;

import com.devhire.notification.config.EmailProperties;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmtpEmailDeliveryServiceTest {

    @Test
    void sendsMimeMessageWithConfiguredGmailSenderAndReplyTo() throws Exception {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        var service = new SmtpEmailDeliveryService(mailSender,
                new EmailProperties(true, "devhire.sender@gmail.com", "reply@gmail.com", "http://localhost:8080"));

        EmailDeliveryResult result = service.send(new EmailMessage(
                "candidate@example.com",
                "[DevHire Cloud] Application status changed",
                "<p>Your application moved to interview.</p>",
                "Your application moved to interview."));

        assertThat(result.sent()).isTrue();
        assertThat(((InternetAddress) mimeMessage.getFrom()[0]).getAddress()).isEqualTo("devhire.sender@gmail.com");
        assertThat(((InternetAddress) mimeMessage.getReplyTo()[0]).getAddress()).isEqualTo("reply@gmail.com");
        assertThat(((InternetAddress) mimeMessage.getRecipients(Message.RecipientType.TO)[0]).getAddress())
                .isEqualTo("candidate@example.com");
        assertThat(mimeMessage.getSubject()).isEqualTo("[DevHire Cloud] Application status changed");
        verify(mailSender).send(mimeMessage);
    }

    @Test
    void returnsFailedResultWhenSmtpProviderRejectsMessage() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("authentication failed")).when(mailSender).send(mimeMessage);
        var service = new SmtpEmailDeliveryService(mailSender,
                new EmailProperties(true, "devhire.sender@gmail.com", null, "http://localhost:8080"));

        EmailDeliveryResult result = service.send(new EmailMessage(
                "candidate@example.com",
                "Subject",
                "<p>HTML</p>",
                "Text"));

        assertThat(result.sent()).isFalse();
        assertThat(result.failureReason()).contains("authentication failed");
    }
}
