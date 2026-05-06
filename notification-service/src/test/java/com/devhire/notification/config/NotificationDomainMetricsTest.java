package com.devhire.notification.config;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationDomainMetricsTest {
    @Test
    void registersNotificationAndEmailDeliveryGauges() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        new NotificationDomainMetrics(new CountingJdbcTemplate(), registry);

        assertThat(registry.find("devhire_notifications_total")
                .tag("type", "APPLICATION_SUBMITTED")
                .tag("read", "false")
                .gauge()
                .value()).isEqualTo(33.0d);
        assertThat(registry.find("devhire_notifications_total")
                .tag("type", "APPLICATION_SUBMITTED")
                .tag("read", "true")
                .gauge()
                .value()).isEqualTo(18.0d);
        assertThat(registry.find("devhire_email_delivery_total")
                .tag("status", "FAILED_RETRYABLE")
                .gauge()
                .value()).isEqualTo(5.0d);
    }

    @Test
    void returnsZeroWhenNotificationTablesAreUnavailable() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        new NotificationDomainMetrics(new FailingJdbcTemplate(), registry);

        assertThat(registry.find("devhire_email_delivery_total")
                .tag("status", "PENDING")
                .gauge()
                .value()).isZero();
    }

    private static class CountingJdbcTemplate extends JdbcTemplate {
        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            if (sql.contains("read_at IS NULL")) {
                return requiredType.cast(33L);
            }
            if (sql.contains("read_at IS NOT NULL")) {
                return requiredType.cast(18L);
            }
            return requiredType.cast(5L);
        }
    }

    private static class FailingJdbcTemplate extends JdbcTemplate {
        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            throw new DataAccessResourceFailureException("database unavailable");
        }
    }
}
