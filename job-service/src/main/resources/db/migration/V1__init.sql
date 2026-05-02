CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    employer_id UUID NOT NULL,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(8000) NOT NULL,
    requirements VARCHAR(8000),
    benefits VARCHAR(4000),
    salary_min NUMERIC(14, 2),
    salary_max NUMERIC(14, 2),
    location VARCHAR(160),
    level VARCHAR(80),
    type VARCHAR(80),
    skills_csv VARCHAR(1000),
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    rejection_reason VARCHAR(500),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_jobs_status CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'CLOSED', 'REJECTED')),
    CONSTRAINT chk_jobs_salary_range CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max)
);

CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_level ON jobs(level);
CREATE INDEX idx_jobs_salary ON jobs(salary_min, salary_max);
CREATE INDEX idx_jobs_search_vector ON jobs USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' ||
                         coalesce(requirements, '') || ' ' || coalesce(skills_csv, ''))
);

