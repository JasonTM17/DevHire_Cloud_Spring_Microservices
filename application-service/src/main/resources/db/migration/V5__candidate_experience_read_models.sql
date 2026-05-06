CREATE TABLE candidate_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL,
    job_title VARCHAR(180) NOT NULL,
    company_name VARCHAR(180) NOT NULL,
    compensation VARCHAR(160) NOT NULL,
    status VARCHAR(32) NOT NULL,
    highlights_csv VARCHAR(1000) NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_candidate_offers_status CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED'))
);

CREATE INDEX idx_candidate_offers_candidate_status ON candidate_offers(candidate_id, status);

CREATE TABLE candidate_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL,
    title VARCHAR(180) NOT NULL,
    provider VARCHAR(120) NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL,
    skills_csv VARCHAR(1000) NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_candidate_assessments_status CHECK (status IN ('INVITED', 'IN_PROGRESS', 'PASSED', 'NEEDS_REVIEW'))
);

CREATE INDEX idx_candidate_assessments_candidate_status ON candidate_assessments(candidate_id, status);

WITH offer_seed AS (
    SELECT
        i,
        ('50000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS offer_id,
        ('40000000-0000-0000-0001-' || lpad((13 * i)::text, 12, '0'))::uuid AS application_id,
        ('10000000-0000-0000-0001-' || lpad((((13 * i - 1) % 60) + 1)::text, 12, '0'))::uuid AS candidate_id,
        (ARRAY[
            'Senior Java Backend Engineer',
            'Cloud Native Java Engineer',
            'Kafka Integration Engineer',
            'Backend SRE Engineer',
            'AI Platform Backend Engineer'
        ])[((i - 1) % 5) + 1] AS job_title,
        (ARRAY['Portfolio Labs','Cloudway Systems','SignalForge AI','KafkaWay Platform','FinTech Corp'])[((i - 1) % 5) + 1] AS company_name,
        (ARRAY['SENT','SENT','ACCEPTED','DRAFT','EXPIRED'])[((i - 1) % 5) + 1] AS status
    FROM generate_series(1, 12) AS i
)
INSERT INTO candidate_offers (
    id, application_id, candidate_id, job_title, company_name, compensation, status,
    highlights_csv, expires_at, created_at
)
SELECT
    offer_id,
    application_id,
    candidate_id,
    job_title,
    company_name,
    format('$%s - $%s / month', 4200 + (i * 120), 6500 + (i * 180)),
    status,
    'Remote-friendly,Learning budget,Architecture ownership,Production SLO accountability',
    now() + ((14 - (i % 7)) || ' days')::interval,
    now() - ((i % 20) || ' days')::interval
FROM offer_seed
WHERE EXISTS (SELECT 1 FROM job_applications ja WHERE ja.id = offer_seed.application_id)
ON CONFLICT (id) DO NOTHING;

WITH assessment_seed AS (
    SELECT
        i,
        ('51000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS assessment_id,
        ('10000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS candidate_id,
        (ARRAY[
            'Java Microservices Design',
            'Kafka Outbox Reliability',
            'Cloud Infrastructure Review',
            'OpenSearch Relevance Debugging',
            'Production Incident Response'
        ])[((i - 1) % 5) + 1] AS title,
        (ARRAY['DevHire Labs','Platform Review Board','Cloud Guild'])[((i - 1) % 3) + 1] AS provider,
        CASE WHEN i % 7 = 0 THEN 'IN_PROGRESS' WHEN i % 5 = 0 THEN 'NEEDS_REVIEW' ELSE 'PASSED' END AS status
    FROM generate_series(1, 60) AS i
)
INSERT INTO candidate_assessments (
    id, candidate_id, title, provider, score, max_score, status, skills_csv, completed_at, created_at
)
SELECT
    assessment_id,
    candidate_id,
    title,
    provider,
    70 + (i % 25),
    100,
    status,
    'Java,Spring Boot,Kafka,PostgreSQL,AWS,Observability',
    CASE WHEN status = 'IN_PROGRESS' THEN NULL ELSE now() - ((i % 30) || ' days')::interval END,
    now() - ((i % 45) || ' days')::interval
FROM assessment_seed
ON CONFLICT (id) DO NOTHING;
