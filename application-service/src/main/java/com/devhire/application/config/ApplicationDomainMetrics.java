package com.devhire.application.config;

import com.devhire.application.entity.ApplicationStatus;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ApplicationDomainMetrics {
    private static final String NONE = "NONE";

    private final JdbcTemplate jdbcTemplate;

    public ApplicationDomainMetrics(JdbcTemplate jdbcTemplate, MeterRegistry meterRegistry) {
        this.jdbcTemplate = jdbcTemplate;
        for (ApplicationStatus status : ApplicationStatus.values()) {
            Gauge.builder("devhire_applications_total", () -> countApplications(status))
                    .description("Current DevHire job applications by status")
                    .tag("status", status.name())
                    .register(meterRegistry);
            Gauge.builder("devhire_application_status_transitions_total",
                            () -> countTransitions(null, status))
                    .description("Current DevHire application transition history rows")
                    .tag("from", NONE)
                    .tag("to", status.name())
                    .register(meterRegistry);
            for (ApplicationStatus from : ApplicationStatus.values()) {
                Gauge.builder("devhire_application_status_transitions_total",
                                () -> countTransitions(from, status))
                        .description("Current DevHire application transition history rows")
                        .tag("from", from.name())
                        .tag("to", status.name())
                        .register(meterRegistry);
            }
        }
    }

    private long countApplications(ApplicationStatus status) {
        return count("SELECT count(*) FROM job_applications WHERE status = ?", status.name());
    }

    private long countTransitions(ApplicationStatus from, ApplicationStatus to) {
        if (from == null) {
            return count("SELECT count(*) FROM application_status_history WHERE old_status IS NULL AND new_status = ?",
                    to.name());
        }
        return count("SELECT count(*) FROM application_status_history WHERE old_status = ? AND new_status = ?",
                from.name(), to.name());
    }

    private long count(String sql, Object... args) {
        try {
            Long value = jdbcTemplate.queryForObject(sql, Long.class, args);
            return value == null ? 0 : value;
        } catch (DataAccessException ex) {
            return 0;
        }
    }
}
