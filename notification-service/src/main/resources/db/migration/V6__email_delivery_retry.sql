ALTER TABLE notifications
    ADD COLUMN email_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN email_next_attempt_at TIMESTAMPTZ,
    ADD COLUMN email_last_attempt_at TIMESTAMPTZ;

UPDATE notifications
SET email_next_attempt_at = now()
WHERE email_status = 'PENDING' AND email_next_attempt_at IS NULL;

CREATE INDEX idx_notifications_email_due
    ON notifications (email_status, email_next_attempt_at, created_at)
    WHERE email_status IN ('PENDING', 'FAILED_RETRYABLE');
