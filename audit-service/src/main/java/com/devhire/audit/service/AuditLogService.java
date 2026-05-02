package com.devhire.audit.service;

import com.devhire.audit.dto.response.AuditLogResponse;
import com.devhire.audit.entity.AuditLog;
import com.devhire.audit.mapper.AuditLogMapper;
import com.devhire.audit.repository.AuditLogRepository;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static com.devhire.audit.repository.AuditLogSpecifications.action;
import static com.devhire.audit.repository.AuditLogSpecifications.actorId;
import static com.devhire.audit.repository.AuditLogSpecifications.occurredFrom;
import static com.devhire.audit.repository.AuditLogSpecifications.occurredTo;

@Service
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper mapper;

    public AuditLogService(AuditLogRepository auditLogRepository, AuditLogMapper mapper) {
        this.auditLogRepository = auditLogRepository;
        this.mapper = mapper;
    }

    @Transactional
    public void record(AuditEvent event) {
        if (auditLogRepository.existsByEventId(event.eventId())) {
            return;
        }
        auditLogRepository.save(new AuditLog(
                event.eventId(),
                event.actorId(),
                event.actorEmail(),
                event.actorRole(),
                event.action(),
                event.resourceType(),
                event.resourceId(),
                event.metadata(),
                event.occurredAt()
        ));
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> findLogs(AuthenticatedUser admin, UUID actorId, String action,
                                           Instant from, Instant to, Pageable pageable) {
        if (admin.role() != UserRole.ADMIN) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Required role: ADMIN");
        }
        Specification<AuditLog> specification = Specification.allOf(
                actorId(actorId),
                action(action),
                occurredFrom(from),
                occurredTo(to)
        );
        return auditLogRepository.findAll(specification, pageable).map(mapper::toResponse);
    }
}
