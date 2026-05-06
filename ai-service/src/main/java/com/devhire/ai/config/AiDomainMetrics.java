package com.devhire.ai.config;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AiDomainMetrics {
    private final JdbcTemplate jdbcTemplate;

    public AiDomainMetrics(JdbcTemplate jdbcTemplate, MeterRegistry meterRegistry) {
        this.jdbcTemplate = jdbcTemplate;
        Gauge.builder("devhire_ai_conversations_total", () -> count("ai_conversations"))
                .description("Current DevHire AI conversation rows")
                .register(meterRegistry);
        Gauge.builder("devhire_ai_usage_events_total", () -> count("ai_usage_events"))
                .description("Current DevHire AI usage event rows")
                .register(meterRegistry);
    }

    private long count(String table) {
        try {
            Long value = jdbcTemplate.queryForObject("SELECT count(*) FROM " + table, Long.class);
            return value == null ? 0 : value;
        } catch (DataAccessException ex) {
            return 0;
        }
    }
}
