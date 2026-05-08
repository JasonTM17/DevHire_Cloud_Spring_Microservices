package com.devhire.audit.service;

import com.devhire.audit.dto.response.ActionCountResponse;
import com.devhire.audit.dto.response.OperationsSummaryResponse;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@Service
public class OperationsReadModelService {
    private final JdbcTemplate jdbcTemplate;

    public OperationsReadModelService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public OperationsSummaryResponse summary(AuthenticatedUser user) {
        if (user.role() != UserRole.ADMIN) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Required role: ADMIN");
        }
        Long auditEvents = jdbcTemplate.queryForObject("SELECT count(*) FROM audit_logs", Long.class);
        Long distinctActors = jdbcTemplate.queryForObject("SELECT count(DISTINCT actor_id) FROM audit_logs", Long.class);
        Timestamp latest = jdbcTemplate.queryForObject("SELECT max(created_at) FROM audit_logs", Timestamp.class);
        return new OperationsSummaryResponse(
                value(auditEvents),
                value(distinctActors),
                latest == null ? null : latest.toInstant(),
                topActions(),
                actorRoles());
    }

    private List<ActionCountResponse> topActions() {
        return jdbcTemplate.query("""
                SELECT action AS label, count(*) AS total
                FROM audit_logs
                GROUP BY action
                ORDER BY total DESC, action
                LIMIT 8
                """, (rs, rowNum) -> new ActionCountResponse(rs.getString("label"), rs.getLong("total")));
    }

    private List<ActionCountResponse> actorRoles() {
        return jdbcTemplate.query("""
                SELECT actor_role AS label, count(*) AS total
                FROM audit_logs
                GROUP BY actor_role
                ORDER BY total DESC, actor_role
                """, (rs, rowNum) -> new ActionCountResponse(rs.getString("label"), rs.getLong("total")));
    }

    private static long value(Long value) {
        return value == null ? 0 : value;
    }
}
