package com.devhire.job.entity;

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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "jobs")
public class Job {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "employer_id", nullable = false)
    private UUID employerId;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 8000)
    private String description;

    @Column(length = 8000)
    private String requirements;

    @Column(length = 4000)
    private String benefits;

    @Column(name = "salary_min", precision = 14, scale = 2)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 14, scale = 2)
    private BigDecimal salaryMax;

    @Column(length = 160)
    private String location;

    @Column(length = 80)
    private String level;

    @Column(length = 80)
    private String type;

    @Column(name = "skills_csv", length = 1000)
    private String skillsCsv;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private JobStatus status = JobStatus.DRAFT;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Job() {
    }

    public Job(UUID companyId, UUID employerId) {
        this.companyId = companyId;
        this.employerId = employerId;
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

    public UUID getCompanyId() {
        return companyId;
    }

    public UUID getEmployerId() {
        return employerId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getRequirements() {
        return requirements;
    }

    public String getBenefits() {
        return benefits;
    }

    public BigDecimal getSalaryMin() {
        return salaryMin;
    }

    public BigDecimal getSalaryMax() {
        return salaryMax;
    }

    public String getLocation() {
        return location;
    }

    public String getLevel() {
        return level;
    }

    public String getType() {
        return type;
    }

    public String getSkillsCsv() {
        return skillsCsv;
    }

    public JobStatus getStatus() {
        return status;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void updateContent(String title, String description, String requirements, String benefits,
                              BigDecimal salaryMin, BigDecimal salaryMax, String location,
                              String level, String type, String skillsCsv) {
        this.title = title;
        this.description = description;
        this.requirements = requirements;
        this.benefits = benefits;
        this.salaryMin = salaryMin;
        this.salaryMax = salaryMax;
        this.location = location;
        this.level = level;
        this.type = type;
        this.skillsCsv = skillsCsv;
        if (status == JobStatus.REJECTED) {
            status = JobStatus.DRAFT;
            rejectionReason = null;
        }
    }

    public void submitReview() {
        status = JobStatus.PENDING_REVIEW;
        rejectionReason = null;
    }

    public void approve() {
        status = JobStatus.PUBLISHED;
        publishedAt = Instant.now();
        rejectionReason = null;
    }

    public void reject(String reason) {
        status = JobStatus.REJECTED;
        rejectionReason = reason;
    }

    public void close() {
        status = JobStatus.CLOSED;
    }
}

