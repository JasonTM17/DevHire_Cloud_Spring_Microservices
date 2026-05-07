CREATE TABLE code_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    level VARCHAR(64) NOT NULL,
    language VARCHAR(64) NOT NULL,
    prompt TEXT NOT NULL,
    constraints_text TEXT NOT NULL,
    starter_code TEXT NOT NULL,
    skills_csv VARCHAR(1000) NOT NULL,
    required_signals_csv VARCHAR(1000) NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 100,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE code_assessment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL,
    employer_id UUID NOT NULL,
    job_id UUID NOT NULL,
    challenge_id UUID NOT NULL REFERENCES code_challenges(id),
    candidate_name VARCHAR(160) NOT NULL,
    job_title VARCHAR(180) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ASSIGNED',
    due_at TIMESTAMPTZ NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_code_assessment_assignment_status CHECK (
        status IN ('ASSIGNED', 'SUBMITTED', 'AUTO_REVIEWED', 'EMPLOYER_REVIEWED', 'PASSED', 'FAILED')
    ),
    CONSTRAINT uq_code_assessment_application_challenge UNIQUE (application_id, challenge_id)
);

CREATE TABLE code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES code_assessment_assignments(id) ON DELETE CASCADE,
    language VARCHAR(64) NOT NULL,
    code_text TEXT NOT NULL,
    candidate_notes VARCHAR(1200),
    static_score INTEGER NOT NULL,
    final_score INTEGER NOT NULL,
    decision VARCHAR(32) NOT NULL,
    rubric_json JSONB NOT NULL,
    risk_flags_csv VARCHAR(1000),
    feedback VARCHAR(1200) NOT NULL,
    employer_feedback VARCHAR(1200),
    ai_feedback_fallback BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(32) NOT NULL DEFAULT 'AUTO_REVIEWED',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_code_submission_decision CHECK (decision IN ('ADVANCE', 'REVIEW', 'HOLD', 'REJECT')),
    CONSTRAINT chk_code_submission_status CHECK (status IN ('SUBMITTED', 'AUTO_REVIEWED', 'EMPLOYER_REVIEWED'))
);

CREATE TABLE code_review_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES code_assessment_assignments(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    note VARCHAR(1200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_code_assignments_candidate_status ON code_assessment_assignments(candidate_id, status);
CREATE INDEX idx_code_assignments_employer_status ON code_assessment_assignments(employer_id, status);
CREATE INDEX idx_code_assignments_job_status ON code_assessment_assignments(job_id, status);
CREATE INDEX idx_code_submissions_assignment_submitted ON code_submissions(assignment_id, submitted_at DESC);
CREATE INDEX idx_code_submissions_decision ON code_submissions(decision);

INSERT INTO code_challenges (
    id, slug, title, level, language, prompt, constraints_text, starter_code, skills_csv, required_signals_csv
)
VALUES
(
    '52000000-0000-0000-0001-000000000001',
    'java-outbox-retry-review',
    'Java outbox retry reviewer',
    'Senior',
    'Java',
    'Implement a small service method that scans pending outbox events, claims a batch, publishes each event, and records retry-safe state transitions.',
    'Do not execute untrusted code. Show transaction boundaries, idempotency thinking, max attempts, and clear failure handling.',
    'class OutboxRetryReviewer {\n    ReviewResult review(List<OutboxEvent> events) {\n        // implement retry-safe review\n    }\n}',
    'Java,Spring Boot,Kafka,PostgreSQL,Outbox',
    'transaction,batch,maxAttempts,publishedAt,lastError,Map,@Test,assert'
),
(
    '52000000-0000-0000-0001-000000000002',
    'sql-application-funnel',
    'SQL application funnel diagnostics',
    'Mid-Senior',
    'SQL',
    'Write a query strategy that summarizes application status counts, interview conversion, and stale review queues for an employer workspace.',
    'Prefer indexed filters and pagination-safe aggregation. Explain how the query avoids scanning unrelated employers.',
    'SELECT status, count(*)\nFROM job_applications\nWHERE employer_id = :employerId\nGROUP BY status;',
    'SQL,PostgreSQL,Indexes,Analytics',
    'employer_id,GROUP BY,index,LIMIT,status,count,assert'
),
(
    '52000000-0000-0000-0001-000000000003',
    'system-design-search-resilience',
    'Search resilience implementation sketch',
    'Senior',
    'Java',
    'Design a resilient search flow that uses OpenSearch first and a PostgreSQL recovery path while preserving published-only visibility and latency evidence.',
    'Include adapter status, timing, exception handling, and tests for published-only behavior.',
    'class JobSearchResilience {\n    SearchResult search(SearchCriteria criteria) {\n        // implement adapter recovery\n    }\n}',
    'Java,OpenSearch,PostgreSQL,Observability',
    'OpenSearch,PostgreSQL,published,Timer,recovery,@Test,assert'
)
ON CONFLICT (id) DO NOTHING;

WITH ranked_applications AS (
    SELECT
        ja.*,
        row_number() OVER (ORDER BY ja.created_at DESC, ja.id) AS rn
    FROM job_applications ja
    WHERE ja.status IN ('SUBMITTED', 'REVIEWING', 'INTERVIEW', 'OFFER')
),
assignment_seed AS (
    SELECT
        ('53000000-0000-0000-0001-' || lpad(rn::text, 12, '0'))::uuid AS assignment_id,
        id AS application_id,
        candidate_id,
        employer_id,
        job_id,
        job_title,
        (ARRAY[
            '52000000-0000-0000-0001-000000000001',
            '52000000-0000-0000-0001-000000000002',
            '52000000-0000-0000-0001-000000000003'
        ])[((rn - 1) % 3) + 1]::uuid AS challenge_id,
        (ARRAY['ASSIGNED','AUTO_REVIEWED','EMPLOYER_REVIEWED','PASSED','FAILED'])[((rn - 1) % 5) + 1] AS status,
        (ARRAY['Linh Nguyen','Minh Tran','Aiko Sato','Bao Pham','Priya Shah','Kenji Mori'])[((rn - 1) % 6) + 1] AS candidate_name,
        rn
    FROM ranked_applications
    WHERE rn <= 18
)
INSERT INTO code_assessment_assignments (
    id, application_id, candidate_id, employer_id, job_id, challenge_id, candidate_name, job_title, status, due_at, assigned_at, updated_at
)
SELECT
    assignment_id,
    application_id,
    candidate_id,
    employer_id,
    job_id,
    challenge_id,
    candidate_name,
    job_title,
    status,
    now() + ((7 + (rn % 8)) || ' days')::interval,
    now() - ((rn % 14) || ' days')::interval,
    now() - ((rn % 5) || ' days')::interval
FROM assignment_seed
ON CONFLICT (id) DO NOTHING;

UPDATE code_assessment_assignments
SET status = 'ASSIGNED',
    candidate_name = 'DevHire Candidate',
    due_at = now() + interval '6 days',
    updated_at = now()
WHERE application_id = '40000000-0000-0000-0000-000000000001'
  AND candidate_id = '00000000-0000-0000-0000-000000000003';

WITH submitted_assignments AS (
    SELECT
        a.*,
        row_number() OVER (ORDER BY a.assigned_at DESC, a.id) AS rn
    FROM code_assessment_assignments a
    WHERE a.status IN ('AUTO_REVIEWED', 'EMPLOYER_REVIEWED', 'PASSED', 'FAILED')
)
INSERT INTO code_submissions (
    id, assignment_id, language, code_text, candidate_notes, static_score, final_score, decision,
    rubric_json, risk_flags_csv, feedback, employer_feedback, ai_feedback_fallback, status, submitted_at, reviewed_at, updated_at
)
SELECT
    ('54000000-0000-0000-0001-' || lpad(rn::text, 12, '0'))::uuid,
    id,
    CASE WHEN rn % 3 = 2 THEN 'SQL' ELSE 'Java' END,
    CASE WHEN rn % 3 = 2 THEN
        'SELECT status, count(*) AS total FROM job_applications WHERE employer_id = :employerId GROUP BY status ORDER BY status LIMIT 50; -- indexed employer_id status aggregate with assert coverage'
    ELSE
        'class CandidateSolution { Map<String, Integer> review(List<Event> events) { /* transaction batch maxAttempts publishedAt lastError */ return Map.of("published", events.size()); } @Test void givenPendingEvents_whenReviewed_thenPublishesBatch() { assert true; } }'
    END,
    'Submission explains transaction boundary, indexed lookup, and reviewer-safe test evidence.',
    78 + (rn % 17),
    CASE WHEN status = 'FAILED' THEN 62 ELSE 78 + (rn % 17) END,
    CASE WHEN status = 'FAILED' THEN 'REJECT' WHEN status = 'PASSED' THEN 'ADVANCE' ELSE 'REVIEW' END,
    jsonb_build_array(
        jsonb_build_object('category','Correctness and completeness','score',32 + (rn % 7),'maxScore',40,'evidence','Required implementation signals found'),
        jsonb_build_object('category','Maintainability and readability','score',16,'maxScore',20,'evidence','Readable structure and named boundaries'),
        jsonb_build_object('category','Complexity and performance','score',12,'maxScore',15,'evidence','Indexed/batched approach described'),
        jsonb_build_object('category','Security posture','score',15,'maxScore',15,'evidence','No high-risk static smells detected'),
        jsonb_build_object('category','Test and evidence quality','score',8,'maxScore',10,'evidence','Assertion evidence included')
    ),
    CASE WHEN rn % 6 = 0 THEN 'missing-test-evidence' ELSE '' END,
    'Reviewer-safe deterministic rubric indicates the submission is ready for employer review.',
    CASE WHEN status IN ('PASSED','FAILED','EMPLOYER_REVIEWED') THEN 'Employer review recorded with rubric evidence.' ELSE NULL END,
    true,
    CASE WHEN status IN ('PASSED','FAILED','EMPLOYER_REVIEWED') THEN 'EMPLOYER_REVIEWED' ELSE 'AUTO_REVIEWED' END,
    now() - ((rn % 9) || ' days')::interval,
    CASE WHEN status IN ('PASSED','FAILED','EMPLOYER_REVIEWED') THEN now() - ((rn % 4) || ' days')::interval ELSE NULL END,
    now() - ((rn % 3) || ' days')::interval
FROM submitted_assignments
ON CONFLICT (id) DO NOTHING;
