package com.devhire.common.outbox;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "devhire.outbox.publisher")
public record OutboxProperties(
        boolean enabled,
        int batchSize,
        int maxAttempts,
        long fixedDelayMs,
        long sendTimeoutMs,
        long initialBackoffSeconds,
        long maxBackoffSeconds
) {
    public OutboxProperties {
        if (batchSize <= 0) {
            batchSize = 25;
        }
        if (maxAttempts <= 0) {
            maxAttempts = 10;
        }
        if (fixedDelayMs <= 0) {
            fixedDelayMs = 5000;
        }
        if (sendTimeoutMs <= 0) {
            sendTimeoutMs = 10000;
        }
        if (initialBackoffSeconds <= 0) {
            initialBackoffSeconds = 5;
        }
        if (maxBackoffSeconds <= 0) {
            maxBackoffSeconds = 3600;
        }
    }
}
