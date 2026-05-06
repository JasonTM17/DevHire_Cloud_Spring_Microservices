package com.devhire.common.outbox;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class OutboxMetricsTest {
    @Test
    void registersBacklogGaugePerOutboxStatus() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        new OutboxMetrics(new CountingJdbcTemplate(), registry, "application-service");

        assertThat(registry.find("devhire_outbox_backlog")
                .tag("service", "application-service")
                .tag("status", "PENDING")
                .gauge()
                .value()).isEqualTo(7.0d);
        assertThat(registry.find("devhire_outbox_backlog")
                .tag("service", "application-service")
                .tag("status", "DEAD_LETTER")
                .gauge()
                .value()).isEqualTo(2.0d);
    }

    @Test
    void fallsBackToZeroWhenOutboxTableIsUnavailable() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        new OutboxMetrics(new FailingJdbcTemplate(), registry, "job-service");

        assertThat(registry.find("devhire_outbox_backlog")
                .tag("service", "job-service")
                .tag("status", "FAILED")
                .gauge()
                .value()).isZero();
    }

    private static class CountingJdbcTemplate extends JdbcTemplate {
        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            String status = args[0].toString();
            long count = switch (status) {
                case "PENDING" -> 7L;
                case "DEAD_LETTER" -> 2L;
                default -> 1L;
            };
            return requiredType.cast(count);
        }
    }

    private static class FailingJdbcTemplate extends JdbcTemplate {
        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            throw new DataAccessResourceFailureException("database unavailable");
        }
    }
}
