package com.devhire.notification.entity;

public enum EmailStatus {
    PENDING,
    SENDING,
    SENT,
    FAILED_RETRYABLE,
    FAILED_PERMANENT,
    DISABLED,
    SKIPPED_NO_EMAIL
}
