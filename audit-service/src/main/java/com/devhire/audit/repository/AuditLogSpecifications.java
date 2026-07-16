package com.devhire.audit.repository;

import com.devhire.audit.entity.AuditLog;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

public final class AuditLogSpecifications {
    private AuditLogSpecifications() {
    }

    public static Specification<AuditLog> actorId(UUID actorId) {
        return actorId == null ? Specification.unrestricted() : (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("actorId"), actorId);
    }

    public static Specification<AuditLog> action(String action) {
        if (action == null || action.isBlank()) {
            return Specification.unrestricted();
        }
        String normalized = action.toLowerCase(Locale.ROOT);
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(criteriaBuilder.lower(root.get("action")), normalized);
    }

    public static Specification<AuditLog> occurredFrom(Instant from) {
        return from == null ? Specification.unrestricted() : (root, query, criteriaBuilder) ->
                criteriaBuilder.greaterThanOrEqualTo(root.get("occurredAt"), from);
    }

    public static Specification<AuditLog> occurredTo(Instant to) {
        return to == null ? Specification.unrestricted() : (root, query, criteriaBuilder) ->
                criteriaBuilder.lessThanOrEqualTo(root.get("occurredAt"), to);
    }
}
