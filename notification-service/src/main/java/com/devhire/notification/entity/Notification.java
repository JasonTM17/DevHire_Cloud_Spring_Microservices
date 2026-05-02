package com.devhire.notification.entity;

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
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    @Column(nullable = false, length = 64)
    private String type;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "read_at")
    private Instant readAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_status", nullable = false, length = 32)
    private EmailStatus emailStatus = EmailStatus.PENDING;

    @Column(name = "email_recipient", length = 320)
    private String emailRecipient;

    @Column(name = "email_provider_message_id", length = 200)
    private String emailProviderMessageId;

    @Column(name = "email_failure_reason", length = 1000)
    private String emailFailureReason;

    @Column(name = "email_sent_at")
    private Instant emailSentAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Notification() {
    }

    public Notification(UUID recipientId, String type, String title, String message) {
        this.recipientId = recipientId;
        this.type = type;
        this.title = title;
        this.message = message;
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

    public UUID getRecipientId() {
        return recipientId;
    }

    public String getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public EmailStatus getEmailStatus() {
        return emailStatus;
    }

    public String getEmailRecipient() {
        return emailRecipient;
    }

    public String getEmailProviderMessageId() {
        return emailProviderMessageId;
    }

    public String getEmailFailureReason() {
        return emailFailureReason;
    }

    public Instant getEmailSentAt() {
        return emailSentAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isRead() {
        return readAt != null;
    }

    public void markRead() {
        if (readAt == null) {
            readAt = Instant.now();
        }
    }

    public void markEmailDisabled() {
        emailStatus = EmailStatus.DISABLED;
        emailFailureReason = null;
    }

    public void markEmailSkippedNoAddress() {
        emailStatus = EmailStatus.SKIPPED_NO_EMAIL;
        emailFailureReason = "Recipient email was not available";
    }

    public void markEmailSent(String recipient, String providerMessageId) {
        emailStatus = EmailStatus.SENT;
        emailRecipient = recipient;
        emailProviderMessageId = providerMessageId;
        emailFailureReason = null;
        emailSentAt = Instant.now();
    }

    public void markEmailFailed(String recipient, String reason) {
        emailStatus = EmailStatus.FAILED;
        emailRecipient = recipient;
        emailFailureReason = reason == null ? "Unknown email delivery failure" : reason;
    }
}
