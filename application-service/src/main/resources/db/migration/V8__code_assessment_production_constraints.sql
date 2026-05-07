ALTER TABLE code_challenges
    ADD CONSTRAINT chk_code_challenge_max_score_range CHECK (max_score BETWEEN 1 AND 100);

ALTER TABLE code_submissions
    ADD CONSTRAINT chk_code_submission_static_score_range CHECK (static_score BETWEEN 0 AND 100),
    ADD CONSTRAINT chk_code_submission_final_score_range CHECK (final_score BETWEEN 0 AND 100),
    ADD CONSTRAINT chk_code_submission_attempt_positive CHECK (attempt_number > 0),
    ADD CONSTRAINT chk_code_submission_hash_sha256 CHECK (code_hash ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT chk_code_submission_grader_version_present CHECK (length(trim(grader_version)) BETWEEN 3 AND 40),
    ADD CONSTRAINT chk_code_submission_rubric_version_present CHECK (length(trim(rubric_version)) BETWEEN 3 AND 40);

CREATE UNIQUE INDEX IF NOT EXISTS uq_code_submissions_assignment_attempt
    ON code_submissions(assignment_id, attempt_number);
