ALTER TABLE code_submissions
    ADD COLUMN IF NOT EXISTS attempt_number INTEGER,
    ADD COLUMN IF NOT EXISTS code_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS grader_version VARCHAR(40),
    ADD COLUMN IF NOT EXISTS rubric_version VARCHAR(40);

WITH ranked AS (
    SELECT
        id,
        row_number() OVER (PARTITION BY assignment_id ORDER BY submitted_at ASC, id ASC) AS attempt
    FROM code_submissions
)
UPDATE code_submissions s
SET attempt_number = ranked.attempt,
    code_hash = COALESCE(s.code_hash, lpad(md5(s.code_text), 64, '0')),
    grader_version = COALESCE(s.grader_version, 'static-rubric-v1'),
    rubric_version = COALESCE(s.rubric_version, 'devhire-code-rubric-v1')
FROM ranked
WHERE s.id = ranked.id;

ALTER TABLE code_submissions
    ALTER COLUMN attempt_number SET DEFAULT 1,
    ALTER COLUMN grader_version SET DEFAULT 'static-rubric-v1',
    ALTER COLUMN rubric_version SET DEFAULT 'devhire-code-rubric-v1';

ALTER TABLE code_submissions
    ALTER COLUMN attempt_number SET NOT NULL,
    ALTER COLUMN code_hash SET NOT NULL,
    ALTER COLUMN grader_version SET NOT NULL,
    ALTER COLUMN rubric_version SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_code_submissions_assignment_attempt
    ON code_submissions(assignment_id, attempt_number DESC);

