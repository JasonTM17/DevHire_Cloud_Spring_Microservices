package com.devhire.notification.config;

import com.devhire.notification.entity.EmailStatus;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class NotificationDomainMetrics {
    private static final String[] NOTIFICATION_TYPES = {
            "APPLICATION_SUBMITTED",
            "APPLICATION_STATUS_CHANGED",
            "JOB_APPROVED",
            "RECRUITER_UPDATE"
    };

    private final JdbcTemplate jdbcTemplate;

    public NotificationDomainMetrics(JdbcTemplate jdbcTemplate, MeterRegistry meterRegistry) {
        this.jdbcTemplate = jdbcTemplate;
        for (String type : NOTIFICATION_TYPES) {
            for (boolean read : new boolean[]{true, false}) {
                Gauge.builder("devhire_notifications_total", () -> countNotifications(type, read))
                        .description("Current DevHire notifications by type and read state")
                        .tag("type", type)
                        .tag("read", Boolean.toString(read))
                        .register(meterRegistry);
            }
        }
        for (EmailStatus status : EmailStatus.values()) {
            Gauge.builder("devhire_email_delivery_total", () -> countEmailStatus(status))
                    .description("Current DevHire notification email delivery rows by status")
                    .tag("status", status.name())
                    .register(meterRegistry);
        }
    }

    private long countNotifications(String type, boolean read) {
        String readPredicate = read ? "read_at IS NOT NULL" : "read_at IS NULL";
        return count("SELECT count(*) FROM notifications WHERE type = ? AND " + readPredicate, type);
    }

    private long countEmailStatus(EmailStatus status) {
        return count("SELECT count(*) FROM notifications WHERE email_status = ?", status.name());
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
