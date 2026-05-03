package com.devhire.notification.email;

import com.devhire.notification.config.EmailProperties;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class EmailRetryPolicy {
    private final EmailProperties properties;

    public EmailRetryPolicy(EmailProperties properties) {
        this.properties = properties;
    }

    public boolean canRetry(int attempts) {
        return attempts < properties.maxAttempts();
    }

    public Instant nextAttemptAt(int attempts, Instant now) {
        int exponent = Math.max(0, attempts - 1);
        long delay = properties.retryInitialDelaySeconds();
        for (int i = 0; i < exponent; i++) {
            if (delay >= properties.retryMaxDelaySeconds()) {
                delay = properties.retryMaxDelaySeconds();
                break;
            }
            delay = Math.min(delay * 2, properties.retryMaxDelaySeconds());
        }
        return now.plusSeconds(delay);
    }
}
