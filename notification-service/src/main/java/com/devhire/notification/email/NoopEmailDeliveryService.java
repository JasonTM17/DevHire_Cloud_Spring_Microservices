package com.devhire.notification.email;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(EmailDeliveryService.class)
public class NoopEmailDeliveryService implements EmailDeliveryService {
    @Override
    public EmailDeliveryResult send(EmailMessage message) {
        return EmailDeliveryResult.failed("Email delivery is disabled");
    }
}
