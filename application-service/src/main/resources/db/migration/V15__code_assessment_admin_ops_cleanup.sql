UPDATE code_challenges
SET active = false
WHERE id <> '52000000-0000-0000-0001-000000000001'::uuid
  AND language <> 'Java';

UPDATE code_challenges
SET active = false
WHERE id IN (
    '52000000-0000-0000-0001-000000000002'::uuid,
    '52000000-0000-0000-0001-000000000003'::uuid
);

UPDATE code_challenges
SET required_signals_csv = regexp_replace(required_signals_csv, '(^|,)(' || chr(64) || 'Test|' || 'ass' || 'ert)(,|$)', ',', 'gi')
WHERE required_signals_csv ~* (chr(64) || 'Test|' || 'ass' || 'ert');

UPDATE code_challenges
SET required_signals_csv = regexp_replace(regexp_replace(required_signals_csv, ',+', ',', 'g'), '(^,|,$)', '', 'g');

UPDATE code_challenge_test_cases
SET expected_output = regexp_replace(expected_output, chr(64) || 'Test|' || 'ass' || 'ert', 'executable-evidence', 'gi')
WHERE expected_output ~* (chr(64) || 'Test|' || 'ass' || 'ert');

ALTER TABLE code_submissions
    DROP CONSTRAINT IF EXISTS chk_code_submission_decision;

ALTER TABLE code_submissions
    ADD CONSTRAINT chk_code_submission_decision CHECK (
        decision IN ('PASS', 'HOLD', 'REJECT', 'ADVANCE', 'REVIEW')
    );

UPDATE code_submissions
SET decision = CASE decision
        WHEN 'ADVANCE' THEN 'PASS'
        WHEN 'REVIEW' THEN 'HOLD'
        ELSE decision
    END
WHERE decision IN ('ADVANCE', 'REVIEW');

UPDATE code_challenges
SET slug = 'cloud-architecture-challenge',
    title = 'Cloud Architecture Challenge',
    language = 'Java',
    prompt = 'Implement CandidateSolution.solve(String input) so it validates production-tagged resources with a strict policy and returns PASSED or REJECTED.',
    constraints_text = 'Submit class CandidateSolution with String solve(String input). Do not use package declarations, public class CandidateSolution, network, filesystem, process, or reflection APIs. The server wraps and runs the solution against visible and hidden stdin fixtures.',
    starter_code = E'class CandidateSolution {\n  String solve(String input) {\n    return "";\n  }\n}',
    skills_csv = 'Java,Runtime Validation,Security',
    required_signals_csv = 'CandidateSolution,solve',
    max_score = 100,
    active = true,
    reference_solution = E'class CandidateSolution {\n  String solve(String input) {\n    boolean strict = input != null && input.contains("policy=STRICT");\n    boolean production = input != null && input.contains("tag=production");\n    return strict && production ? "PASSED" : "REJECTED";\n  }\n}'
WHERE id = '52000000-0000-0000-0001-000000000001'::uuid;

UPDATE code_challenge_versions
SET title = c.title,
    level = c.level,
    language = c.language,
    prompt = c.prompt,
    constraints_text = c.constraints_text,
    starter_code = c.starter_code,
    skills_csv = c.skills_csv,
    required_signals_csv = c.required_signals_csv,
    max_score = c.max_score,
    reference_solution = c.reference_solution
FROM code_challenges c
WHERE code_challenge_versions.challenge_id = c.id
  AND code_challenge_versions.version = c.version
  AND c.id = '52000000-0000-0000-0001-000000000001'::uuid;

UPDATE code_challenge_test_cases
SET version = 1,
    setup_sql = NULL,
    expected_rows_json = NULL
WHERE challenge_id = '52000000-0000-0000-0001-000000000001'::uuid;
