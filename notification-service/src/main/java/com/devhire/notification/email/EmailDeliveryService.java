package com.devhire.notification.email;

public interface EmailDeliveryService {
    EmailDeliveryResult send(EmailMessage message);
}
