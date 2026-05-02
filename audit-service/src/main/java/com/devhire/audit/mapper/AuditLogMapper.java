package com.devhire.audit.mapper;

import com.devhire.audit.dto.response.AuditLogResponse;
import com.devhire.audit.entity.AuditLog;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {
    public AuditLogResponse toResponse(AuditLog auditLog) {
        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getEventId(),
                auditLog.getActorId(),
                auditLog.getActorEmail(),
                auditLog.getActorRole(),
                auditLog.getAction(),
                auditLog.getResourceType(),
                auditLog.getResourceId(),
                auditLog.getMetadata(),
                auditLog.getOccurredAt(),
                auditLog.getCreatedAt()
        );
    }
}
