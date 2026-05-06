package com.devhire.audit.config;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AuditDomainMetrics {
    private static final String[] ACTIONS = {
            "REGISTER",
            "LOGIN",
            "CREATE_COMPANY",
            "APPROVE_COMPANY",
            "CREATE_JOB",
            "APPROVE_JOB",
            "SEARCH_JOBS",
            "SUBMIT_APPLICATION",
            "CHANGE_APPLICATION_STATUS",
            "AI_CHAT_REQUESTED",
            "AI_TOOL_EXECUTED",
            "AI_FALLBACK_USED"
    };

    private final JdbcTemplate jdbcTemplate;

    public AuditDomainMetrics(JdbcTemplate jdbcTemplate, MeterRegistry meterRegistry) {
        this.jdbcTemplate = jdbcTemplate;
        for (String action : ACTIONS) {
            Gauge.builder("devhire_audit_ingested_total", () -> count(action))
                    .description("Current DevHire audit log rows by action")
                    .tag("action", action)
                    .register(meterRegistry);
        }
    }

    private long count(String action) {
        try {
            Long value = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM audit_logs WHERE action = ?",
                    Long.class,
                    action
            );
            return value == null ? 0 : value;
        } catch (DataAccessException ex) {
            return 0;
        }
    }
}
