package com.devhire.notification.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "devhire.notification.email")
public record EmailProperties(
        boolean enabled,
        String from,
        String replyTo,
        String dashboardBaseUrl
) {
    public EmailProperties {
        if (from == null || from.isBlank()) {
            from = "no-reply@devhire.local";
        }
        if (dashboardBaseUrl == null || dashboardBaseUrl.isBlank()) {
            dashboardBaseUrl = "http://localhost:8080";
        }
    }
}
