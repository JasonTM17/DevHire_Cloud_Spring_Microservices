WITH conversation_seed AS (
    SELECT
        i,
        ('70000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS conversation_id,
        CASE
            WHEN i % 3 = 0 THEN '00000000-0000-0000-0000-000000000001'::uuid
            WHEN i % 3 = 1 THEN '00000000-0000-0000-0000-000000000003'::uuid
            ELSE '00000000-0000-0000-0000-000000000002'::uuid
        END AS user_id,
        CASE
            WHEN i % 3 = 0 THEN 'admin@devhire.local'
            WHEN i % 3 = 1 THEN 'candidate@devhire.local'
            ELSE 'employer@devhire.local'
        END AS user_email,
        CASE
            WHEN i % 3 = 0 THEN 'ADMIN'
            WHEN i % 3 = 1 THEN 'CANDIDATE'
            ELSE 'EMPLOYER'
        END AS user_role,
        (ARRAY[
            'Explain the production architecture',
            'Find senior Java jobs with Kafka',
            'Show the recruiter demo path',
            'Summarize cloud readiness',
            'Explain AI safety controls'
        ])[((i - 1) % 5) + 1] AS title
    FROM generate_series(1, 20) AS i
)
INSERT INTO ai_conversations (
    id, user_id, user_email, user_role, title, model, created_at, updated_at, last_message_at
)
SELECT
    conversation_id,
    user_id,
    user_email,
    user_role,
    title,
    'claude-haiku-4-5-20251001',
    now() - ((i % 20) || ' days')::interval,
    now() - ((i % 6) || ' hours')::interval,
    now() - ((i % 6) || ' hours')::interval
FROM conversation_seed
ON CONFLICT (id) DO NOTHING;

WITH conversation_seed AS (
    SELECT
        i,
        ('70000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS conversation_id,
        (ARRAY[
            'Explain the production architecture',
            'Find senior Java jobs with Kafka',
            'Show the recruiter demo path',
            'Summarize cloud readiness',
            'Explain AI safety controls'
        ])[((i - 1) % 5) + 1] AS prompt
    FROM generate_series(1, 20) AS i
)
INSERT INTO ai_messages (
    id, conversation_id, role, content, fallback, citations, tool_traces, created_at
)
SELECT
    ('71000000-0000-0000-0001-' || lpad(((i * 2) - 1)::text, 12, '0'))::uuid,
    conversation_id,
    'USER',
    prompt,
    FALSE,
    '[]'::jsonb,
    '[]'::jsonb,
    now() - ((i % 20) || ' days')::interval
FROM conversation_seed
ON CONFLICT (id) DO NOTHING;

WITH conversation_seed AS (
    SELECT
        i,
        ('70000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS conversation_id,
        (ARRAY[
            'DevHire Cloud uses API Gateway, service-owned PostgreSQL databases, Kafka/outbox reliability, OpenSearch search, observability, CI/CD, Helm, and AWS Terraform blueprint evidence.',
            'Senior Java roles with Kafka are available across the portfolio dataset; use the job search page to filter by Kafka, Spring Boot, and cloud platform ownership.',
            'The 10-minute demo path starts with job search, job detail, candidate apply, employer pipeline review, admin audit, notification delivery, and AI assistant evidence.',
            'The AWS blueprint is apply-ready but not applied locally: VPC, EKS, RDS, Redis, MSK, OpenSearch, ECR, Secrets Manager, External Secrets, Helm, and Argo CD are verified without credentials.',
            'The AI assistant does not need provider secrets for review: deterministic fallback, citations, tool traces, prompt-injection refusal tests, and audit events are included.'
        ])[((i - 1) % 5) + 1] AS answer
    FROM generate_series(1, 20) AS i
)
INSERT INTO ai_messages (
    id, conversation_id, role, content, fallback, citations, tool_traces, created_at
)
SELECT
    ('71000000-0000-0000-0001-' || lpad((i * 2)::text, 12, '0'))::uuid,
    conversation_id,
    'ASSISTANT',
    answer,
    TRUE,
    jsonb_build_array(
        jsonb_build_object(
            'sourceType', 'DOC',
            'sourcePath', 'docs/architecture.md',
            'title', 'Architecture',
            'snippet', 'Service boundaries, gateway routing, async events, and cloud deployment topology.'
        ),
        jsonb_build_object(
            'sourceType', 'DOC',
            'sourcePath', 'docs/REVIEW_EVIDENCE.md',
            'title', 'Reviewer Evidence',
            'snippet', 'Curated release, runtime, security, cloud, and observability proof for reviewers.'
        )
    ),
    jsonb_build_array(
        jsonb_build_object('name', 'explain_architecture', 'status', 'completed', 'summary', 'Architecture evidence retrieved'),
        jsonb_build_object('name', 'get_platform_health_snapshot', 'status', 'completed', 'summary', 'Platform health snapshot generated')
    ),
    now() - ((i % 20) || ' days')::interval + '5 minutes'::interval
FROM conversation_seed
ON CONFLICT (id) DO NOTHING;

WITH usage_seed AS (
    SELECT
        i,
        ('70000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS conversation_id,
        CASE
            WHEN i % 3 = 0 THEN '00000000-0000-0000-0000-000000000001'::uuid
            WHEN i % 3 = 1 THEN '00000000-0000-0000-0000-000000000003'::uuid
            ELSE '00000000-0000-0000-0000-000000000002'::uuid
        END AS user_id
    FROM generate_series(1, 20) AS i
)
INSERT INTO ai_usage_events (
    id, conversation_id, user_id, model, fallback, tool_count, prompt_chars, answer_chars, latency_ms, created_at
)
SELECT
    ('72000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid,
    conversation_id,
    user_id,
    'claude-haiku-4-5-20251001',
    TRUE,
    2,
    80 + (i * 3),
    420 + (i * 9),
    180 + (i * 12),
    now() - ((i % 20) || ' days')::interval
FROM usage_seed
ON CONFLICT (id) DO NOTHING;
