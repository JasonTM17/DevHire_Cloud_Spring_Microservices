package com.devhire.user.entity;

import com.devhire.common.security.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_profiles")
public class UserProfile {
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 320)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private UserRole role;

    @Column(length = 120)
    private String name;

    @Column(length = 160)
    private String title;

    @Column(name = "skills_csv", length = 1000)
    private String skillsCsv;

    @Column(length = 4000)
    private String experience;

    @Column(length = 4000)
    private String education;

    @Column(name = "expected_salary", precision = 14, scale = 2)
    private BigDecimal expectedSalary;

    @Column(name = "company_position", length = 120)
    private String companyPosition;

    @Column(name = "contact_info", length = 500)
    private String contactInfo;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected UserProfile() {
    }

    public UserProfile(UUID userId, String email, UserRole role) {
        this.userId = userId;
        this.email = email;
        this.role = role;
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

    public UUID getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public UserRole getRole() {
        return role;
    }

    public String getName() {
        return name;
    }

    public String getTitle() {
        return title;
    }

    public String getSkillsCsv() {
        return skillsCsv;
    }

    public String getExperience() {
        return experience;
    }

    public String getEducation() {
        return education;
    }

    public BigDecimal getExpectedSalary() {
        return expectedSalary;
    }

    public String getCompanyPosition() {
        return companyPosition;
    }

    public String getContactInfo() {
        return contactInfo;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void updateIdentity(String email, UserRole role) {
        this.email = email;
        this.role = role;
    }

    public void updateCandidate(String name, String title, String skillsCsv, String experience,
                                String education, BigDecimal expectedSalary, String avatarUrl) {
        this.name = name;
        this.title = title;
        this.skillsCsv = skillsCsv;
        this.experience = experience;
        this.education = education;
        this.expectedSalary = expectedSalary;
        this.avatarUrl = avatarUrl;
    }

    public void updateEmployer(String name, String title, String companyPosition, String contactInfo,
                               String avatarUrl) {
        this.name = name;
        this.title = title;
        this.companyPosition = companyPosition;
        this.contactInfo = contactInfo;
        this.avatarUrl = avatarUrl;
    }
}

