package com.devhire.notification.email;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "devhire.notification.email", name = "enabled", havingValue = "false", matchIfMissing = true)
public class NoopEmailDeliveryService implements EmailDeliveryService {
    @Override
    public EmailDeliveryResult send(EmailMessage message) {
        return EmailDeliveryResult.failed("Email delivery is disabled");
    }
}
