ALTER TABLE code_challenges
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS reference_solution TEXT;

ALTER TABLE code_challenges
    ADD CONSTRAINT chk_code_challenge_version_positive CHECK (version > 0);

CREATE TABLE IF NOT EXISTS code_challenge_versions (
    challenge_id UUID NOT NULL REFERENCES code_challenges(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title VARCHAR(180) NOT NULL,
    level VARCHAR(64) NOT NULL,
    language VARCHAR(64) NOT NULL,
    prompt TEXT NOT NULL,
    constraints_text TEXT NOT NULL,
    starter_code TEXT NOT NULL,
    skills_csv VARCHAR(1000) NOT NULL,
    required_signals_csv VARCHAR(1000) NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 100,
    reference_solution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (challenge_id, version),
    CONSTRAINT chk_code_challenge_version_language_supported CHECK (language IN ('Java', 'SQL', 'TypeScript')),
    CONSTRAINT chk_code_challenge_version_score_range CHECK (max_score BETWEEN 1 AND 100)
);

INSERT INTO code_challenge_versions (
    challenge_id, version, title, level, language, prompt, constraints_text, starter_code,
    skills_csv, required_signals_csv, max_score, reference_solution, created_at
)
SELECT
    id,
    version,
    title,
    level,
    language,
    prompt,
    constraints_text,
    starter_code,
    skills_csv,
    required_signals_csv,
    max_score,
    reference_solution,
    created_at
FROM code_challenges
ON CONFLICT (challenge_id, version) DO NOTHING;

ALTER TABLE code_challenge_test_cases
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE code_challenge_test_cases
    DROP CONSTRAINT IF EXISTS uq_code_test_case_name;

ALTER TABLE code_challenge_test_cases
    ADD CONSTRAINT chk_code_test_case_version_positive CHECK (version > 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_code_test_case_challenge_version_name
    ON code_challenge_test_cases(challenge_id, version, name);

CREATE INDEX IF NOT EXISTS idx_code_test_cases_challenge_version_visibility
    ON code_challenge_test_cases(challenge_id, version, visibility, ordinal);

ALTER TABLE code_assessment_assignments
    ADD COLUMN IF NOT EXISTS challenge_version INTEGER NOT NULL DEFAULT 1;

UPDATE code_assessment_assignments a
SET challenge_version = c.version
FROM code_challenges c
WHERE a.challenge_id = c.id
  AND a.challenge_version IS NULL;

ALTER TABLE code_assessment_assignments
    DROP CONSTRAINT IF EXISTS chk_code_assessment_assignment_status;

ALTER TABLE code_assessment_assignments
    ADD CONSTRAINT chk_code_assessment_assignment_status CHECK (
        status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'EXPIRED',
                   'AUTO_REVIEWED', 'EMPLOYER_REVIEWED', 'PASSED', 'FAILED')
    ),
    ADD CONSTRAINT fk_code_assignment_challenge_version
        FOREIGN KEY (challenge_id, challenge_version)
        REFERENCES code_challenge_versions(challenge_id, version);

ALTER TABLE code_submissions
    ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES code_assessment_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_code_submissions_run_id
    ON code_submissions(run_id);

UPDATE code_assessment_runs
SET verdict = CASE verdict
        WHEN 'TIME_LIMIT' THEN 'TIME_LIMIT_EXCEEDED'
        WHEN 'MEMORY_LIMIT' THEN 'MEMORY_LIMIT_EXCEEDED'
        ELSE verdict
    END;

UPDATE code_assessment_run_results
SET verdict = CASE verdict
        WHEN 'TIME_LIMIT' THEN 'TIME_LIMIT_EXCEEDED'
        WHEN 'MEMORY_LIMIT' THEN 'MEMORY_LIMIT_EXCEEDED'
        ELSE verdict
    END;

ALTER TABLE code_assessment_runs
    DROP CONSTRAINT IF EXISTS chk_code_run_verdict;

ALTER TABLE code_assessment_runs
    ADD CONSTRAINT chk_code_run_verdict CHECK (
        verdict IN ('ACCEPTED', 'WRONG_ANSWER', 'COMPILE_ERROR', 'TIME_LIMIT_EXCEEDED',
                    'MEMORY_LIMIT_EXCEEDED', 'TIME_LIMIT', 'MEMORY_LIMIT',
                    'RUNTIME_ERROR', 'POLICY_BLOCKED', 'RUNNER_UNAVAILABLE')
    );

ALTER TABLE code_assessment_run_results
    DROP CONSTRAINT IF EXISTS chk_code_run_result_verdict;

ALTER TABLE code_assessment_run_results
    ADD CONSTRAINT chk_code_run_result_verdict CHECK (
        verdict IN ('ACCEPTED', 'WRONG_ANSWER', 'COMPILE_ERROR', 'TIME_LIMIT_EXCEEDED',
                    'MEMORY_LIMIT_EXCEEDED', 'TIME_LIMIT', 'MEMORY_LIMIT',
                    'RUNTIME_ERROR', 'POLICY_BLOCKED', 'RUNNER_UNAVAILABLE')
    );

UPDATE code_challenges
SET reference_solution = starter_code
WHERE id = '52000000-0000-0000-0001-000000000001'::uuid
  AND reference_solution IS NULL;

UPDATE code_challenge_versions cv
SET reference_solution = c.reference_solution
FROM code_challenges c
WHERE cv.challenge_id = c.id
  AND cv.reference_solution IS NULL;
