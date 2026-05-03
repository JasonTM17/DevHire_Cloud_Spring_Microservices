package com.devhire.notification.email;

import com.devhire.notification.config.EmailProperties;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class EmailRetryPolicyTest {
    private final EmailRetryPolicy retryPolicy = new EmailRetryPolicy(
            new EmailProperties(true, "no-reply@devhire.local", null, "http://localhost:8080",
                    25, 5, 30, 900, 60)
    );

    @Test
    void calculatesExponentialBackoffWithinConfiguredMaximum() {
        Instant now = Instant.parse("2026-05-03T00:00:00Z");

        assertThat(retryPolicy.nextAttemptAt(1, now)).isEqualTo(now.plusSeconds(30));
        assertThat(retryPolicy.nextAttemptAt(2, now)).isEqualTo(now.plusSeconds(60));
        assertThat(retryPolicy.nextAttemptAt(8, now)).isEqualTo(now.plusSeconds(900));
    }

    @Test
    void stopsRetryingAtMaxAttempts() {
        assertThat(retryPolicy.canRetry(4)).isTrue();
        assertThat(retryPolicy.canRetry(5)).isFalse();
    }
}
