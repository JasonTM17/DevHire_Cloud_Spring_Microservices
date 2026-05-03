CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email VARCHAR(180) NOT NULL,
    user_role VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    model VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user_updated ON ai_conversations(user_id, updated_at DESC);

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    content TEXT NOT NULL,
    fallback BOOLEAN NOT NULL DEFAULT false,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    tool_traces JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_ai_messages_role CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM'))
);

CREATE INDEX idx_ai_messages_conversation_created ON ai_messages(conversation_id, created_at);

CREATE TABLE ai_knowledge_documents (
    id UUID PRIMARY KEY,
    source_type VARCHAR(40) NOT NULL,
    source_path VARCHAR(300) NOT NULL,
    title VARCHAR(180) NOT NULL,
    content_hash VARCHAR(96) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_knowledge_source UNIQUE (source_type, source_path)
);

CREATE TABLE ai_knowledge_chunks (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES ai_knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    search_text TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_knowledge_chunk UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_ai_knowledge_chunks_search ON ai_knowledge_chunks USING GIN (search_text);

CREATE TABLE ai_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    model VARCHAR(120) NOT NULL,
    fallback BOOLEAN NOT NULL,
    tool_count INTEGER NOT NULL,
    prompt_chars INTEGER NOT NULL,
    answer_chars INTEGER NOT NULL,
    latency_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_events_created ON ai_usage_events(created_at DESC);

CREATE TABLE outbox_events (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    topic VARCHAR(120) NOT NULL,
    aggregate_type VARCHAR(120) NOT NULL,
    aggregate_id UUID,
    event_type VARCHAR(160) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_outbox_status_next_attempt ON outbox_events(status, next_attempt_at);
CREATE INDEX idx_ai_outbox_aggregate ON outbox_events(aggregate_type, aggregate_id);
