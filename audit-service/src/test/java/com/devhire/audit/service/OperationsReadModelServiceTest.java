package com.devhire.audit.service;

import com.devhire.audit.dto.response.ActionCountResponse;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.junit.jupiter.api.Test;
import org.mockito.stubbing.Answer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OperationsReadModelServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final OperationsReadModelService service = new OperationsReadModelService(jdbcTemplate);

    @Test
    void adminReadsOperationsSummaryAggregates() {
        when(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_logs", Long.class)).thenReturn(284L);
        when(jdbcTemplate.queryForObject("SELECT count(DISTINCT actor_id) FROM audit_logs", Long.class)).thenReturn(72L);
        when(jdbcTemplate.queryForObject("SELECT max(created_at) FROM audit_logs", Timestamp.class))
                .thenReturn(Timestamp.from(Instant.parse("2026-05-06T08:30:00Z")));
        when(jdbcTemplate.query(contains("GROUP BY action"), any(RowMapper.class)))
                .thenAnswer(actionRows("SEARCH_JOBS", 151));
        when(jdbcTemplate.query(contains("GROUP BY actor_role"), any(RowMapper.class)))
                .thenAnswer(actionRows("CANDIDATE", 180));

        var response = service.summary(new AuthenticatedUser(UUID.randomUUID(), "admin@devhire.local", UserRole.ADMIN));

        assertThat(response.auditEvents()).isEqualTo(284);
        assertThat(response.distinctActors()).isEqualTo(72);
        assertThat(response.latestEventAt()).isEqualTo(Instant.parse("2026-05-06T08:30:00Z"));
        assertThat(response.topActions()).containsExactly(new ActionCountResponse("SEARCH_JOBS", 151));
        assertThat(response.actorRoles()).containsExactly(new ActionCountResponse("CANDIDATE", 180));
    }

    @Test
    void adminSummaryHandlesEmptyAuditLogTimestamp() {
        when(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_logs", Long.class)).thenReturn(0L);
        when(jdbcTemplate.queryForObject("SELECT count(DISTINCT actor_id) FROM audit_logs", Long.class)).thenReturn(0L);
        when(jdbcTemplate.queryForObject("SELECT max(created_at) FROM audit_logs", Timestamp.class)).thenReturn(null);
        when(jdbcTemplate.query(contains("GROUP BY action"), any(RowMapper.class))).thenReturn(List.of());
        when(jdbcTemplate.query(contains("GROUP BY actor_role"), any(RowMapper.class))).thenReturn(List.of());

        var response = service.summary(new AuthenticatedUser(UUID.randomUUID(), "admin@devhire.local", UserRole.ADMIN));

        assertThat(response.auditEvents()).isZero();
        assertThat(response.distinctActors()).isZero();
        assertThat(response.latestEventAt()).isNull();
        assertThat(response.topActions()).isEmpty();
        assertThat(response.actorRoles()).isEmpty();
    }

    @Test
    void nonAdminCannotReadOperationsSummary() {
        assertThatThrownBy(() -> service.summary(
                new AuthenticatedUser(UUID.randomUUID(), "employer@devhire.local", UserRole.EMPLOYER)))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Required role: ADMIN");

        verifyNoInteractions(jdbcTemplate);
    }

    @SuppressWarnings("unchecked")
    private static Answer<List<ActionCountResponse>> actionRows(String label, long total) {
        return invocation -> {
            RowMapper<ActionCountResponse> mapper = invocation.getArgument(1);
            ResultSet resultSet = mock(ResultSet.class);
            when(resultSet.getString("label")).thenReturn(label);
            when(resultSet.getLong("total")).thenReturn(total);
            return List.of(mapper.mapRow(resultSet, 0));
        };
    }
}
