package com.devhire.audit.config;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class AuditDomainMetricsTest {
    @Test
    void registersAuditIngestionGaugePerAction() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        new AuditDomainMetrics(new CountingJdbcTemplate(), registry);

        assertThat(registry.find("devhire_audit_ingested_total")
                .tag("action", "SUBMIT_APPLICATION")
                .gauge()
                .value()).isEqualTo(64.0d);
        assertThat(registry.find("devhire_audit_ingested_total")
                .tag("action", "AI_FALLBACK_USED")
                .gauge()
                .value()).isEqualTo(9.0d);
    }

    @Test
    void returnsZeroWhenAuditTableIsUnavailable() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        new AuditDomainMetrics(new FailingJdbcTemplate(), registry);

        assertThat(registry.find("devhire_audit_ingested_total")
                .tag("action", "LOGIN")
                .gauge()
                .value()).isZero();
    }

    private static class CountingJdbcTemplate extends JdbcTemplate {
        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            String action = args[0].toString();
            long count = "AI_FALLBACK_USED".equals(action) ? 9L : 64L;
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
