package com.devhire.notification.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "devhire.notification.email")
public record EmailProperties(
        boolean enabled,
        String from,
        String replyTo,
        String dashboardBaseUrl,
        int batchSize,
        int maxAttempts,
        int retryInitialDelaySeconds,
        int retryMaxDelaySeconds,
        int rateLimitPerMinute
) {
    public EmailProperties {
        if (from == null || from.isBlank()) {
            from = "no-reply@devhire.local";
        }
        if (dashboardBaseUrl == null || dashboardBaseUrl.isBlank()) {
            dashboardBaseUrl = "http://localhost:8080";
        }
        if (batchSize <= 0) {
            batchSize = 25;
        }
        if (maxAttempts <= 0) {
            maxAttempts = 5;
        }
        if (retryInitialDelaySeconds <= 0) {
            retryInitialDelaySeconds = 30;
        }
        if (retryMaxDelaySeconds < retryInitialDelaySeconds) {
            retryMaxDelaySeconds = retryInitialDelaySeconds;
        }
        if (rateLimitPerMinute <= 0) {
            rateLimitPerMinute = 60;
        }
    }
}
