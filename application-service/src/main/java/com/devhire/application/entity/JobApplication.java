package com.devhire.application.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "job_applications")
public class JobApplication {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "job_id", nullable = false)
    private UUID jobId;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "employer_id", nullable = false)
    private UUID employerId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "job_title", nullable = false, length = 180)
    private String jobTitle;

    @Column(name = "cv_url", nullable = false, length = 500)
    private String cvUrl;

    @Column(name = "cover_letter", length = 2000)
    private String coverLetter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ApplicationStatus status = ApplicationStatus.SUBMITTED;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected JobApplication() {
    }

    public JobApplication(UUID jobId, UUID companyId, UUID employerId, UUID candidateId,
                          String jobTitle, String cvUrl, String coverLetter) {
        this.jobId = jobId;
        this.companyId = companyId;
        this.employerId = employerId;
        this.candidateId = candidateId;
        this.jobTitle = jobTitle;
        this.cvUrl = cvUrl;
        this.coverLetter = coverLetter;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getJobId() {
        return jobId;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public UUID getEmployerId() {
        return employerId;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public String getCvUrl() {
        return cvUrl;
    }

    public String getCoverLetter() {
        return coverLetter;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public ApplicationStatus changeStatus(ApplicationStatus status) {
        ApplicationStatus oldStatus = this.status;
        this.status = status;
        return oldStatus;
    }
}

