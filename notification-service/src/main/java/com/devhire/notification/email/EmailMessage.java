package com.devhire.notification.email;

public record EmailMessage(
        String recipient,
        String subject,
        String htmlBody,
        String textBody
) {
}
