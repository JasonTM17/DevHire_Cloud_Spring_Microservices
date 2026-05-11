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
        for (String status : new String[]{
                "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "REVIEWED", "EXPIRED",
                "AUTO_REVIEWED", "EMPLOYER_REVIEWED", "PASSED", "FAILED"
        }) {
            Gauge.builder("devhire_code_assessments_total", () -> count("SELECT count(*) FROM code_assessment_assignments WHERE status = ?", status))
                    .description("Current DevHire code assessment assignments by status")
                    .tag("status", status)
                    .register(meterRegistry);
        }
        for (String status : new String[]{"SUBMITTED", "AUTO_REVIEWED", "EMPLOYER_REVIEWED"}) {
            Gauge.builder("devhire_code_submissions_total", () -> count("SELECT count(*) FROM code_submissions WHERE status = ?", status))
                    .description("Current DevHire code submissions by grading status")
                    .tag("language", "ALL")
                    .tag("status", status)
                    .register(meterRegistry);
        }
        Gauge.builder("devhire_code_grading_score", () -> value("SELECT COALESCE(avg(final_score), 0) FROM code_submissions"))
                .description("Average deterministic code assessment score")
                .register(meterRegistry);
        Gauge.builder("devhire_code_review_risk_flags_total", () -> count("""
                        SELECT count(*)
                        FROM code_submissions
                        WHERE risk_flags_csv IS NOT NULL AND risk_flags_csv <> ''
                        """))
                .description("Code submissions with static risk flags")
                .tag("type", "any")
                .register(meterRegistry);
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

    private double value(String sql, Object... args) {
        try {
            Double result = jdbcTemplate.queryForObject(sql, Double.class, args);
            return result == null ? 0 : result;
        } catch (DataAccessException ex) {
            return 0;
        }
    }
}
