WITH generated AS (
    SELECT
        i,
        ((i - 1) % 60) + 1 AS candidate_index,
        (((i * 7) - 1) % 150) + 1 AS job_index,
        CASE
            WHEN i % 17 = 0 THEN 'WITHDRAWN'
            WHEN i % 13 = 0 THEN 'OFFER'
            WHEN i % 11 = 0 THEN 'REJECTED'
            WHEN i % 7 = 0 THEN 'INTERVIEW'
            WHEN i % 5 = 0 THEN 'REVIEWING'
            ELSE 'SUBMITTED'
        END AS status
    FROM generate_series(1, 240) AS i
),
normalized AS (
    SELECT
        i,
        candidate_index,
        job_index,
        ((job_index - 1) % 20) + 1 AS company_index,
        ('40000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS application_id,
        ('10000000-0000-0000-0001-' || lpad(candidate_index::text, 12, '0'))::uuid AS candidate_id,
        ('30000000-0000-0000-0001-' || lpad(job_index::text, 12, '0'))::uuid AS job_id,
        status,
        (ARRAY[
            'Senior Java Backend Engineer',
            'Platform Reliability Engineer',
            'Cloud Native Java Engineer',
            'OpenSearch Relevance Engineer',
            'Kafka Integration Engineer',
            'Backend SRE Engineer',
            'Full Stack Java React Engineer',
            'Security Platform Engineer',
            'Data Platform Engineer',
            'Technical Lead - Microservices',
            'DevOps Automation Engineer',
            'API Gateway Engineer',
            'Observability Engineer',
            'Solution Architect',
            'Payment Backend Engineer'
        ])[((job_index - 1) % 15) + 1] AS role_title
    FROM generated
)
INSERT INTO job_applications (
    id, job_id, company_id, employer_id, candidate_id, job_title, cv_url, cover_letter,
    status, created_at, updated_at, version
)
SELECT
    application_id,
    job_id,
    ('20000000-0000-0000-0001-' || lpad(company_index::text, 12, '0'))::uuid,
    ('10000000-0000-0000-0002-' || lpad((((company_index - 1) % 12) + 1)::text, 12, '0'))::uuid,
    candidate_id,
    format('%s %s', role_title, lpad(job_index::text, 3, '0')),
    format('https://cdn.devhire.local/cv/portfolio-candidate-%s.pdf', lpad(candidate_index::text, 2, '0')),
    format('I am applying for portfolio role %s with hands-on experience in Java, Spring Boot, Kafka, cloud delivery, and production incident response.', job_index),
    status,
    now() - ((i % 60) || ' days')::interval,
    now() - ((i % 9) || ' hours')::interval,
    0
FROM normalized
ON CONFLICT (candidate_id, job_id) DO NOTHING;

WITH normalized AS (
    SELECT
        i,
        ('40000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS application_id,
        ('10000000-0000-0000-0001-' || lpad((((i - 1) % 60) + 1)::text, 12, '0'))::uuid AS candidate_id,
        CASE
            WHEN i % 17 = 0 THEN 'WITHDRAWN'
            WHEN i % 13 = 0 THEN 'OFFER'
            WHEN i % 11 = 0 THEN 'REJECTED'
            WHEN i % 7 = 0 THEN 'INTERVIEW'
            WHEN i % 5 = 0 THEN 'REVIEWING'
            ELSE 'SUBMITTED'
        END AS status
    FROM generate_series(1, 240) AS i
)
INSERT INTO application_status_history (
    application_id, old_status, new_status, changed_by, changed_by_role, note, created_at
)
SELECT
    application_id,
    NULL,
    'SUBMITTED',
    candidate_id,
    'CANDIDATE',
    'Portfolio volume seed application submitted',
    now() - ((i % 60) || ' days')::interval
FROM normalized;

WITH normalized AS (
    SELECT
        i,
        ((i - 1) % 60) + 1 AS candidate_index,
        (((i * 7) - 1) % 150) + 1 AS job_index,
        CASE
            WHEN i % 17 = 0 THEN 'WITHDRAWN'
            WHEN i % 13 = 0 THEN 'OFFER'
            WHEN i % 11 = 0 THEN 'REJECTED'
            WHEN i % 7 = 0 THEN 'INTERVIEW'
            WHEN i % 5 = 0 THEN 'REVIEWING'
            ELSE 'SUBMITTED'
        END AS status
    FROM generate_series(1, 240) AS i
),
transitioned AS (
    SELECT
        i,
        ('40000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS application_id,
        ('10000000-0000-0000-0001-' || lpad(candidate_index::text, 12, '0'))::uuid AS candidate_id,
        ('10000000-0000-0000-0002-' || lpad(((((job_index - 1) % 20) % 12) + 1)::text, 12, '0'))::uuid AS employer_id,
        status
    FROM normalized
    WHERE status <> 'SUBMITTED'
)
INSERT INTO application_status_history (
    application_id, old_status, new_status, changed_by, changed_by_role, note, created_at
)
SELECT
    application_id,
    'SUBMITTED',
    status,
    CASE WHEN status = 'WITHDRAWN' THEN candidate_id ELSE employer_id END,
    CASE WHEN status = 'WITHDRAWN' THEN 'CANDIDATE' ELSE 'EMPLOYER' END,
    CASE
        WHEN status = 'REVIEWING' THEN 'Recruiter screening started'
        WHEN status = 'INTERVIEW' THEN 'Technical interview scheduled'
        WHEN status = 'OFFER' THEN 'Offer stage created for portfolio dataset'
        WHEN status = 'REJECTED' THEN 'Candidate was not selected for this seeded role'
        WHEN status = 'WITHDRAWN' THEN 'Candidate withdrew from the process'
        ELSE 'Status changed'
    END,
    now() - ((i % 14) || ' days')::interval
FROM transitioned;
