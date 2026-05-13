-- Add sequence_number and delivered_at columns for real-time notification ordering
ALTER TABLE notifications ADD COLUMN sequence_number BIGINT;
ALTER TABLE notifications ADD COLUMN delivered_at TIMESTAMPTZ;

-- Index for efficient retrieval of notifications in sequence order per user
CREATE INDEX idx_notifications_user_sequence ON notifications(recipient_id, sequence_number);
