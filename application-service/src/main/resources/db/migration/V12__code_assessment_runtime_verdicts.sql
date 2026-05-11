ALTER TABLE code_assessment_runs
    ADD COLUMN IF NOT EXISTS verdict VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED',
    ADD COLUMN IF NOT EXISTS compile_output_text TEXT,
    ADD COLUMN IF NOT EXISTS stdout_text TEXT,
    ADD COLUMN IF NOT EXISTS stderr_text TEXT,
    ADD COLUMN IF NOT EXISTS time_limit_ms INTEGER NOT NULL DEFAULT 2000,
    ADD COLUMN IF NOT EXISTS memory_limit_kb INTEGER NOT NULL DEFAULT 131072,
    ADD COLUMN IF NOT EXISTS runner_version VARCHAR(80) NOT NULL DEFAULT 'devhire-runtime-v0.7';

ALTER TABLE code_assessment_run_results
    ADD COLUMN IF NOT EXISTS verdict VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED',
    ADD COLUMN IF NOT EXISTS stdout_text TEXT,
    ADD COLUMN IF NOT EXISTS stderr_text TEXT,
    ADD COLUMN IF NOT EXISTS compile_output_text TEXT,
    ADD COLUMN IF NOT EXISTS time_limit_ms INTEGER NOT NULL DEFAULT 2000,
    ADD COLUMN IF NOT EXISTS memory_limit_kb INTEGER NOT NULL DEFAULT 131072;

UPDATE code_assessment_runs
SET verdict = CASE
        WHEN status = 'POLICY_BLOCKED' THEN 'POLICY_BLOCKED'
        WHEN status = 'FAILED' THEN 'RUNNER_UNAVAILABLE'
        WHEN visible_case_count + hidden_case_count > 0
             AND visible_passed_count + hidden_passed_count = visible_case_count + hidden_case_count THEN 'ACCEPTED'
        ELSE 'WRONG_ANSWER'
    END,
    runner_version = COALESCE(NULLIF(runner_version, ''), 'devhire-runtime-v0.7'),
    time_limit_ms = CASE WHEN time_limit_ms > 0 THEN time_limit_ms ELSE 2000 END,
    memory_limit_kb = CASE WHEN memory_limit_kb > 0 THEN memory_limit_kb ELSE 131072 END;

UPDATE code_assessment_run_results
SET verdict = CASE
        WHEN error_text ILIKE '%blocked%' THEN 'POLICY_BLOCKED'
        WHEN passed THEN 'ACCEPTED'
        ELSE 'WRONG_ANSWER'
    END,
    stdout_text = COALESCE(stdout_text, output_text),
    time_limit_ms = CASE WHEN time_limit_ms > 0 THEN time_limit_ms ELSE 2000 END,
    memory_limit_kb = CASE WHEN memory_limit_kb > 0 THEN memory_limit_kb ELSE 131072 END;

ALTER TABLE code_assessment_runs
    ADD CONSTRAINT chk_code_run_verdict CHECK (
        verdict IN ('ACCEPTED', 'WRONG_ANSWER', 'COMPILE_ERROR', 'TIME_LIMIT', 'MEMORY_LIMIT',
                    'RUNTIME_ERROR', 'POLICY_BLOCKED', 'RUNNER_UNAVAILABLE')
    ),
    ADD CONSTRAINT chk_code_run_limits CHECK (time_limit_ms BETWEEN 250 AND 30000 AND memory_limit_kb BETWEEN 16384 AND 1048576);

ALTER TABLE code_assessment_run_results
    ADD CONSTRAINT chk_code_run_result_verdict CHECK (
        verdict IN ('ACCEPTED', 'WRONG_ANSWER', 'COMPILE_ERROR', 'TIME_LIMIT', 'MEMORY_LIMIT',
                    'RUNTIME_ERROR', 'POLICY_BLOCKED', 'RUNNER_UNAVAILABLE')
    ),
    ADD CONSTRAINT chk_code_run_result_limits CHECK (time_limit_ms BETWEEN 250 AND 30000 AND memory_limit_kb BETWEEN 16384 AND 1048576);

CREATE INDEX IF NOT EXISTS idx_code_assessment_runs_verdict_created
    ON code_assessment_runs(verdict, created_at DESC);
