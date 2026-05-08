ALTER TABLE code_challenges
    ADD CONSTRAINT chk_code_challenge_language_supported
        CHECK (language IN ('Java', 'SQL', 'TypeScript'));

ALTER TABLE code_assessment_assignments
    ADD CONSTRAINT chk_code_assessment_due_after_assigned
        CHECK (due_at > assigned_at);

ALTER TABLE code_submissions
    ADD CONSTRAINT chk_code_submission_language_supported
        CHECK (language IN ('Java', 'SQL', 'TypeScript')),
    ADD CONSTRAINT chk_code_submission_text_length
        CHECK (length(trim(code_text)) BETWEEN 40 AND 12000),
    ADD CONSTRAINT chk_code_submission_reviewed_after_submitted
        CHECK (reviewed_at IS NULL OR reviewed_at >= submitted_at);
