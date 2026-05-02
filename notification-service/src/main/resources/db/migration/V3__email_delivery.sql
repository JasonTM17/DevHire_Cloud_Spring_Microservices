ALTER TABLE notifications
    ADD COLUMN email_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN email_recipient VARCHAR(320),
    ADD COLUMN email_provider_message_id VARCHAR(200),
    ADD COLUMN email_failure_reason VARCHAR(1000),
    ADD COLUMN email_sent_at TIMESTAMPTZ;

CREATE INDEX idx_notifications_email_status ON notifications (email_status, created_at DESC);
