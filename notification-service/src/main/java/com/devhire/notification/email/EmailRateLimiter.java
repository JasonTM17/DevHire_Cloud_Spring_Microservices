package com.devhire.notification.email;

import com.devhire.notification.config.EmailProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

@Component
public class EmailRateLimiter {
    private final EmailProperties properties;
    private final Clock clock;
    private Instant windowStartedAt;
    private int sentInWindow;

    @Autowired
    public EmailRateLimiter(EmailProperties properties) {
        this(properties, Clock.systemUTC());
    }

    EmailRateLimiter(EmailProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        this.windowStartedAt = clock.instant();
    }

    public synchronized boolean tryAcquire() {
        Instant now = clock.instant();
        if (now.isAfter(windowStartedAt.plusSeconds(60))) {
            windowStartedAt = now;
            sentInWindow = 0;
        }
        if (sentInWindow >= properties.rateLimitPerMinute()) {
            return false;
        }
        sentInWindow++;
        return true;
    }
}
