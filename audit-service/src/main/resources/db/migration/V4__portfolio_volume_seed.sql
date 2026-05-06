WITH audit_seed AS (
    SELECT
        i,
        CASE
            WHEN i % 8 = 0 THEN 'LOGIN'
            WHEN i % 9 = 0 THEN 'CREATE_COMPANY'
            WHEN i % 10 = 0 THEN 'APPROVE_COMPANY'
            WHEN i % 11 = 0 THEN 'CREATE_JOB'
            WHEN i % 12 = 0 THEN 'APPROVE_JOB'
            WHEN i % 13 = 0 THEN 'SUBMIT_APPLICATION'
            WHEN i % 14 = 0 THEN 'CHANGE_APPLICATION_STATUS'
            WHEN i % 15 = 0 THEN 'AI_TOOL_EXECUTED'
            ELSE 'SEARCH_JOBS'
        END AS action_name,
        CASE
            WHEN i % 5 = 0 THEN 'ADMIN'
            WHEN i % 3 = 0 THEN 'EMPLOYER'
            ELSE 'CANDIDATE'
        END AS actor_role
    FROM generate_series(1, 280) AS i
),
normalized AS (
    SELECT
        i,
        action_name,
        actor_role,
        CASE
            WHEN actor_role = 'ADMIN' THEN '00000000-0000-0000-0000-000000000001'::uuid
            WHEN actor_role = 'EMPLOYER' THEN ('10000000-0000-0000-0002-' || lpad((((i - 1) % 12) + 1)::text, 12, '0'))::uuid
            ELSE ('10000000-0000-0000-0001-' || lpad((((i - 1) % 60) + 1)::text, 12, '0'))::uuid
        END AS actor_id
    FROM audit_seed
)
INSERT INTO audit_logs (
    id, event_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, metadata, occurred_at, created_at
)
SELECT
    ('60000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid,
    ('61000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid,
    actor_id,
    CASE
        WHEN actor_role = 'ADMIN' THEN 'admin@devhire.local'
        WHEN actor_role = 'EMPLOYER' THEN format('employer%02s@devhire.local', ((i - 1) % 12) + 1)
        ELSE format('candidate%02s@devhire.local', ((i - 1) % 60) + 1)
    END,
    actor_role,
    action_name,
    CASE
        WHEN action_name LIKE '%COMPANY%' THEN 'company'
        WHEN action_name LIKE '%JOB%' OR action_name = 'SEARCH_JOBS' THEN 'job'
        WHEN action_name LIKE '%APPLICATION%' THEN 'application'
        WHEN action_name LIKE 'AI_%' THEN 'ai_conversation'
        ELSE 'user'
    END,
    CASE
        WHEN action_name LIKE '%COMPANY%' THEN ('20000000-0000-0000-0001-' || lpad((((i - 1) % 24) + 1)::text, 12, '0'))
        WHEN action_name LIKE '%JOB%' OR action_name = 'SEARCH_JOBS' THEN ('30000000-0000-0000-0001-' || lpad((((i - 1) % 180) + 1)::text, 12, '0'))
        WHEN action_name LIKE '%APPLICATION%' THEN ('40000000-0000-0000-0001-' || lpad((((i - 1) % 240) + 1)::text, 12, '0'))
        WHEN action_name LIKE 'AI_%' THEN ('70000000-0000-0000-0001-' || lpad((((i - 1) % 20) + 1)::text, 12, '0'))
        ELSE actor_id::text
    END,
    jsonb_build_object(
        'source', 'portfolio-volume-seed',
        'sequence', i,
        'surface', CASE WHEN actor_role = 'ADMIN' THEN 'admin-dashboard' WHEN actor_role = 'EMPLOYER' THEN 'employer-dashboard' ELSE 'candidate-search' END,
        'traceId', format('seed-trace-%s', lpad(i::text, 4, '0'))
    ),
    now() - ((i % 60) || ' days')::interval - ((i % 24) || ' hours')::interval,
    now() - ((i % 60) || ' days')::interval
FROM normalized
ON CONFLICT (event_id) DO NOTHING;
