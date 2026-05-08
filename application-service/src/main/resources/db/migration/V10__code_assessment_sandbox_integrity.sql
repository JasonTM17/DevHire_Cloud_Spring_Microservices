CREATE TABLE code_challenge_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES code_challenges(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    visibility VARCHAR(16) NOT NULL,
    input_text TEXT,
    expected_output TEXT NOT NULL,
    weight INTEGER NOT NULL DEFAULT 10,
    ordinal INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_code_test_case_visibility CHECK (visibility IN ('VISIBLE', 'HIDDEN')),
    CONSTRAINT chk_code_test_case_weight CHECK (weight BETWEEN 1 AND 100),
    CONSTRAINT uq_code_test_case_name UNIQUE (challenge_id, name)
);

CREATE TABLE code_assessment_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES code_assessment_assignments(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL,
    language VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    sandbox_status VARCHAR(80) NOT NULL,
    visible_case_count INTEGER NOT NULL DEFAULT 0,
    visible_passed_count INTEGER NOT NULL DEFAULT 0,
    hidden_case_count INTEGER NOT NULL DEFAULT 0,
    hidden_passed_count INTEGER NOT NULL DEFAULT 0,
    execution_time_ms BIGINT NOT NULL DEFAULT 0,
    memory_kb BIGINT NOT NULL DEFAULT 0,
    failure_reason VARCHAR(800),
    integrity_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    similarity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    client_fingerprint_hash VARCHAR(96),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT chk_code_run_status CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'POLICY_BLOCKED', 'FAILED')),
    CONSTRAINT chk_code_run_visible_counts CHECK (visible_case_count >= 0 AND visible_passed_count >= 0 AND visible_passed_count <= visible_case_count),
    CONSTRAINT chk_code_run_hidden_counts CHECK (hidden_case_count >= 0 AND hidden_passed_count >= 0 AND hidden_passed_count <= hidden_case_count),
    CONSTRAINT chk_code_run_integrity_score CHECK (integrity_risk_score BETWEEN 0 AND 100),
    CONSTRAINT chk_code_run_similarity_score CHECK (similarity_score BETWEEN 0 AND 100)
);

CREATE TABLE code_assessment_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES code_assessment_runs(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES code_challenge_test_cases(id) ON DELETE CASCADE,
    visibility VARCHAR(16) NOT NULL,
    name VARCHAR(160) NOT NULL,
    passed BOOLEAN NOT NULL,
    output_text TEXT,
    error_text TEXT,
    execution_time_ms BIGINT NOT NULL DEFAULT 0,
    memory_kb BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_code_run_result_visibility CHECK (visibility IN ('VISIBLE', 'HIDDEN'))
);

CREATE TABLE code_session_integrity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES code_assessment_assignments(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL,
    event_type VARCHAR(48) NOT NULL,
    event_count INTEGER NOT NULL DEFAULT 1,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_code_integrity_event_count CHECK (event_count > 0)
);

CREATE TABLE code_similarity_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES code_assessment_assignments(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES code_submissions(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    similarity_score NUMERIC(5,2) NOT NULL,
    matched_submission_id UUID REFERENCES code_submissions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_code_similarity_hash_sha256 CHECK (code_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT chk_code_similarity_score CHECK (similarity_score BETWEEN 0 AND 100)
);

CREATE INDEX idx_code_test_cases_challenge_visibility ON code_challenge_test_cases(challenge_id, visibility, ordinal);
CREATE INDEX idx_code_assessment_runs_assignment_created ON code_assessment_runs(assignment_id, created_at DESC);
CREATE INDEX idx_code_integrity_assignment ON code_session_integrity_events(assignment_id, occurred_at DESC);
CREATE INDEX idx_code_similarity_assignment ON code_similarity_reports(assignment_id, created_at DESC);

INSERT INTO code_challenge_test_cases (id, challenge_id, name, visibility, input_text, expected_output, weight, ordinal)
VALUES
    ('55000000-0000-0000-0001-000000000001', '52000000-0000-0000-0001-000000000001', 'Visible batch boundary', 'VISIBLE', '3 pending outbox events', 'transaction,batch', 15, 1),
    ('55000000-0000-0000-0001-000000000002', '52000000-0000-0000-0001-000000000001', 'Visible retry cap', 'VISIBLE', 'poison event at max attempts', 'retry,maxAttempts,lastError', 15, 2),
    ('55000000-0000-0000-0001-000000000003', '52000000-0000-0000-0001-000000000001', 'Hidden idempotent publish state', 'HIDDEN', 'duplicate publish replay', 'publishedAt,idempotent', 30, 3),
    ('55000000-0000-0000-0001-000000000004', '52000000-0000-0000-0001-000000000001', 'Hidden assertion evidence', 'HIDDEN', 'reviewer edge case', '@Test,assert', 20, 4),
    ('55000000-0000-0000-0001-000000000005', '52000000-0000-0000-0001-000000000002', 'Visible tenant scope', 'VISIBLE', 'employer scoped rows', 'employer_id,where', 20, 1),
    ('55000000-0000-0000-0001-000000000006', '52000000-0000-0000-0001-000000000002', 'Visible grouped status', 'VISIBLE', 'status funnel', 'GROUP BY,status,count', 20, 2),
    ('55000000-0000-0000-0001-000000000007', '52000000-0000-0000-0001-000000000002', 'Hidden bounded scan', 'HIDDEN', 'large employer history', 'LIMIT,index', 30, 3),
    ('55000000-0000-0000-0001-000000000008', '52000000-0000-0000-0001-000000000003', 'Visible OpenSearch adapter', 'VISIBLE', 'primary search dependency', 'OpenSearch,search', 20, 1),
    ('55000000-0000-0000-0001-000000000009', '52000000-0000-0000-0001-000000000003', 'Visible Postgres recovery', 'VISIBLE', 'dependency outage', 'PostgreSQL,recovery', 20, 2),
    ('55000000-0000-0000-0001-000000000010', '52000000-0000-0000-0001-000000000003', 'Hidden published-only guard', 'HIDDEN', 'private job leak attempt', 'published,@Test,assert', 30, 3)
ON CONFLICT (id) DO NOTHING;
