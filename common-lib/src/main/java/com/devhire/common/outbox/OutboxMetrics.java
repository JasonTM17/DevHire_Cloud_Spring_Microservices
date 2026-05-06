package com.devhire.common.outbox;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

public class OutboxMetrics {
    private final JdbcTemplate jdbcTemplate;

    public OutboxMetrics(JdbcTemplate jdbcTemplate, MeterRegistry meterRegistry, String serviceName) {
        this.jdbcTemplate = jdbcTemplate;
        for (OutboxStatus status : OutboxStatus.values()) {
            Gauge.builder("devhire_outbox_backlog", () -> count(status))
                    .description("Current DevHire transactional outbox rows by service and status")
                    .tag("service", serviceName)
                    .tag("status", status.name())
                    .register(meterRegistry);
        }
    }

    private long count(OutboxStatus status) {
        try {
            Long value = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM outbox_events WHERE status = ?",
                    Long.class,
                    status.name()
            );
            return value == null ? 0 : value;
        } catch (DataAccessException ex) {
            return 0;
        }
    }
}
