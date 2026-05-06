WITH job_seed AS (
    SELECT
        i,
        ((i - 1) % 20) + 1 AS company_index,
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
        ])[((i - 1) % 15) + 1] AS role_title,
        (ARRAY[
            'Ho Chi Minh City',
            'Hanoi',
            'Da Nang',
            'Remote Vietnam',
            'Remote APAC',
            'Singapore / Hybrid',
            'Bangkok / Hybrid',
            'Tokyo / Remote'
        ])[((i - 1) % 8) + 1] AS location,
        (ARRAY['Junior','Middle','Senior','Lead','Principal'])[((i - 1) % 5) + 1] AS level,
        (ARRAY['Full-time','Full-time','Full-time','Contract','Remote'])[((i - 1) % 5) + 1] AS job_type,
        (ARRAY[
            'Java,Spring Boot,PostgreSQL,Kafka',
            'Kubernetes,Terraform,AWS,Prometheus',
            'OpenSearch,Java,Spring Cloud,Redis',
            'React,TypeScript,Java,API Design',
            'Kafka,Outbox,Idempotency,Event Driven',
            'Docker,GitHub Actions,Linux,Observability',
            'Security,OAuth2,JWT,Gateway',
            'PostgreSQL,Data Pipelines,OpenTelemetry,Java'
        ])[((i - 1) % 8) + 1] AS skills_csv,
        CASE
            WHEN i <= 150 THEN 'PUBLISHED'
            WHEN i <= 165 THEN 'PENDING_REVIEW'
            WHEN i <= 175 THEN 'CLOSED'
            WHEN i <= 178 THEN 'DRAFT'
            ELSE 'REJECTED'
        END AS status
    FROM generate_series(1, 180) AS i
),
normalized AS (
    SELECT
        i,
        company_index,
        ('30000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS job_id,
        ('20000000-0000-0000-0001-' || lpad(company_index::text, 12, '0'))::uuid AS company_id,
        ('10000000-0000-0000-0002-' || lpad((((company_index - 1) % 12) + 1)::text, 12, '0'))::uuid AS employer_id,
        role_title,
        location,
        level,
        job_type,
        skills_csv,
        status,
        1200 + (((i - 1) % 10) * 400) AS salary_min
    FROM job_seed
)
INSERT INTO jobs (
    id, company_id, employer_id, title, description, requirements, benefits, salary_min, salary_max,
    location, level, type, skills_csv, status, rejection_reason, published_at, created_at, updated_at, version
)
SELECT
    job_id,
    company_id,
    employer_id,
    format('%s %s', role_title, lpad(i::text, 3, '0')),
    format('Own production-grade hiring platform capabilities for service-owned databases, gateway security, event reliability, search, and observability. This portfolio seed role %s gives reviewers realistic pagination, filtering, and search volume.', i),
    format('Expected skills: %s. Candidates should be comfortable with code review, incident response, automated tests, cloud delivery, and production debugging.', skills_csv),
    'Hybrid flexibility, clear ownership, learning budget, strong engineering culture, observability-first delivery, and technical mentorship.',
    salary_min,
    salary_min + 1800 + (((i - 1) % 4) * 500),
    location,
    level,
    job_type,
    skills_csv,
    status,
    CASE WHEN status = 'REJECTED' THEN 'Seeded example for admin rejection workflow review.' ELSE NULL END,
    CASE WHEN status = 'PUBLISHED' THEN now() - ((i % 45) || ' days')::interval ELSE NULL END,
    now() - ((i % 120) || ' days')::interval,
    now() - ((i % 18) || ' hours')::interval,
    0
FROM normalized
ON CONFLICT (id) DO NOTHING;
