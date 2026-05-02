package com.devhire.audit.service;

import com.devhire.audit.entity.AuditLog;
import com.devhire.audit.mapper.AuditLogMapper;
import com.devhire.audit.repository.AuditLogRepository;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuditLogServiceTest {
    private final AuditLogRepository auditLogRepository = mock(AuditLogRepository.class);
    private final AuditLogService service = new AuditLogService(auditLogRepository, new AuditLogMapper());

    @Test
    void recordStoresNewAuditEvent() {
        UUID eventId = UUID.randomUUID();
        when(auditLogRepository.existsByEventId(eventId)).thenReturn(false);

        service.record(new AuditEvent(eventId, UUID.randomUUID(), "admin@example.com", "ADMIN",
                "approve job", "job", UUID.randomUUID().toString(), Map.of("status", "PUBLISHED"), Instant.now()));

        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void recordSkipsDuplicateEvent() {
        UUID eventId = UUID.randomUUID();
        when(auditLogRepository.existsByEventId(eventId)).thenReturn(true);

        service.record(new AuditEvent(eventId, UUID.randomUUID(), "admin@example.com", "ADMIN",
                "approve job", "job", "job-1", Map.of(), Instant.now()));

        verify(auditLogRepository, never()).save(any(AuditLog.class));
    }

    @Test
    void nonAdminCannotReadAuditLogs() {
        assertThatThrownBy(() -> service.findLogs(
                new AuthenticatedUser(UUID.randomUUID(), "candidate@example.com", UserRole.CANDIDATE),
                null, null, null, null, PageRequest.of(0, 20)))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Required role: ADMIN");
    }

    @Test
    void adminReadsAuditLogs() {
        AuditLog log = new AuditLog(UUID.randomUUID(), UUID.randomUUID(), "admin@example.com", "ADMIN",
                "approve job", "job", "job-1", Map.of("status", "PUBLISHED"),
                Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(log, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(log, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        when(auditLogRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(log)));

        var result = service.findLogs(new AuthenticatedUser(UUID.randomUUID(), "admin@example.com", UserRole.ADMIN),
                null, "approve job", null, null, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().getFirst().action()).isEqualTo("approve job");
    }
}
