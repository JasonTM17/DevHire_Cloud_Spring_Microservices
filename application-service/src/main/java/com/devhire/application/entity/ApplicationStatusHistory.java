package com.devhire.application.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "application_status_history")
public class ApplicationStatusHistory {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status", length = 32)
    private ApplicationStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 32)
    private ApplicationStatus newStatus;

    @Column(name = "changed_by", nullable = false)
    private UUID changedBy;

    @Column(name = "changed_by_role", nullable = false, length = 32)
    private String changedByRole;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ApplicationStatusHistory() {
    }

    public ApplicationStatusHistory(UUID applicationId, ApplicationStatus oldStatus, ApplicationStatus newStatus,
                                    UUID changedBy, String changedByRole, String note) {
        this.applicationId = applicationId;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.changedBy = changedBy;
        this.changedByRole = changedByRole;
        this.note = note;
    }
}

