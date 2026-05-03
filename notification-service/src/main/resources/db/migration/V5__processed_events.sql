CREATE TABLE processed_events (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL,
    consumer_name VARCHAR(120) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_notification_processed_event UNIQUE (event_id, consumer_name)
);

CREATE INDEX idx_notification_processed_events_processed_at ON processed_events(processed_at);
