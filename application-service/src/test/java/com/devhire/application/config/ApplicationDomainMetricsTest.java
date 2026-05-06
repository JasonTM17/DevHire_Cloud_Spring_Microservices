package com.devhire.application.config;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicationDomainMetricsTest {
    @Test
    void registersApplicationAndTransitionGauges() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        new ApplicationDomainMetrics(new CountingJdbcTemplate(), registry);

        assertThat(registry.find("devhire_applications_total")
                .tag("status", "SUBMITTED")
                .gauge()
                .value()).isEqualTo(42.0d);
        assertThat(registry.find("devhire_application_status_transitions_total")
                .tag("from", "NONE")
                .tag("to", "SUBMITTED")
                .gauge()
                .value()).isEqualTo(24.0d);
        assertThat(registry.find("devhire_application_status_transitions_total")
                .tag("from", "SUBMITTED")
                .tag("to", "REVIEWING")
                .gauge()
                .value()).isEqualTo(11.0d);
    }

    @Test
    void returnsZeroWhenApplicationTablesAreUnavailable() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        new ApplicationDomainMetrics(new FailingJdbcTemplate(), registry);

        assertThat(registry.find("devhire_applications_total")
                .tag("status", "OFFER")
                .gauge()
                .value()).isZero();
    }

    private static class CountingJdbcTemplate extends JdbcTemplate {
        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            if (sql.contains("job_applications")) {
                return requiredType.cast(42L);
            }
            if (sql.contains("old_status IS NULL")) {
                return requiredType.cast(24L);
            }
            return requiredType.cast(11L);
        }
    }

    private static class FailingJdbcTemplate extends JdbcTemplate {
        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            throw new DataAccessResourceFailureException("database unavailable");
        }
    }
}
