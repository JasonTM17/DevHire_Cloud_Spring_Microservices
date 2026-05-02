CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    actor_id UUID,
    actor_email VARCHAR(180),
    actor_role VARCHAR(40),
    action VARCHAR(120) NOT NULL,
    resource_type VARCHAR(80),
    resource_id VARCHAR(120),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs (occurred_at DESC);
CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);
