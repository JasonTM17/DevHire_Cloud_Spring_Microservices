CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    company_id UUID NOT NULL,
    employer_id UUID NOT NULL,
    candidate_id UUID NOT NULL,
    job_title VARCHAR(180) NOT NULL,
    cv_url VARCHAR(500) NOT NULL,
    cover_letter VARCHAR(2000),
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_job_applications_status CHECK (status IN ('SUBMITTED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN')),
    CONSTRAINT uq_job_applications_candidate_job UNIQUE (candidate_id, job_id)
);

CREATE TABLE application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    old_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    changed_by UUID NOT NULL,
    changed_by_role VARCHAR(32) NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_applications_candidate_id ON job_applications(candidate_id);
CREATE INDEX idx_job_applications_job_employer ON job_applications(job_id, employer_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_application_status_history_application_id ON application_status_history(application_id);

