UPDATE code_challenges
SET slug = 'cloud-architecture-challenge',
    title = 'Cloud Architecture Challenge',
    prompt = 'Implement CandidateSolution.solve(String input) so it validates production-tagged resources with EnterpriseSecurityPolicy.STRICT and returns PASSED or REJECTED.',
    constraints_text = 'The runtime harness calls CandidateSolution.solve(String input). Keep network/filesystem/process calls out of the solution. Return exactly PASSED or REJECTED on stdout-equivalent output.',
    starter_code = E'class CandidateSolution {\n  String solve(String input) {\n    ResourceValidator validator = new ResourceValidator(EnterpriseSecurityPolicy.STRICT, "production");\n    return validator.validate(input) ? "PASSED" : "REJECTED";\n  }\n}\n\nenum EnterpriseSecurityPolicy { STRICT }\n\nclass ResourceValidator {\n  private final EnterpriseSecurityPolicy policy;\n  private final String requiredTag;\n\n  ResourceValidator(EnterpriseSecurityPolicy policy, String requiredTag) {\n    this.policy = policy;\n    this.requiredTag = requiredTag;\n  }\n\n  boolean validate(String input) {\n    return this.policy == EnterpriseSecurityPolicy.STRICT && input != null && input.contains("policy=STRICT") && input.contains("tag=" + this.requiredTag);\n  }\n}',
    skills_csv = 'Java,Runtime Validation,Security',
    required_signals_csv = 'CandidateSolution,solve,ResourceValidator,EnterpriseSecurityPolicy.STRICT,production,PASSED,REJECTED'
WHERE id = '52000000-0000-0000-0001-000000000001';

UPDATE code_assessment_assignments
SET challenge_id = '52000000-0000-0000-0001-000000000001',
    status = 'ASSIGNED',
    candidate_name = 'DevHire Candidate',
    due_at = GREATEST(due_at, now() + interval '6 days'),
    updated_at = now()
WHERE application_id = '40000000-0000-0000-0000-000000000001'
  AND candidate_id = '00000000-0000-0000-0000-000000000003'
  AND NOT EXISTS (
      SELECT 1
      FROM code_assessment_assignments existing
      WHERE existing.application_id = '40000000-0000-0000-0000-000000000001'
        AND existing.challenge_id = '52000000-0000-0000-0001-000000000001'
  );

INSERT INTO code_assessment_assignments (
    id,
    application_id,
    candidate_id,
    employer_id,
    job_id,
    challenge_id,
    candidate_name,
    job_title,
    status,
    due_at,
    assigned_at,
    updated_at
)
SELECT
    '53000000-0000-0000-0001-000000009999'::uuid,
    ja.id,
    ja.candidate_id,
    ja.employer_id,
    ja.job_id,
    '52000000-0000-0000-0001-000000000001'::uuid,
    'DevHire Candidate',
    ja.job_title,
    'ASSIGNED',
    now() + interval '6 days',
    now() - interval '1 day',
    now()
FROM job_applications ja
WHERE ja.id = '40000000-0000-0000-0000-000000000001'
  AND ja.candidate_id = '00000000-0000-0000-0000-000000000003'
ON CONFLICT (application_id, challenge_id) DO UPDATE
SET status = 'ASSIGNED',
    candidate_name = 'DevHire Candidate',
    due_at = GREATEST(code_assessment_assignments.due_at, EXCLUDED.due_at),
    updated_at = now();

UPDATE code_challenge_test_cases
SET name = 'Runtime solve contract',
    input_text = 'resource=res-9982;policy=STRICT;tag=production',
    expected_output = 'PASSED',
    weight = 15,
    ordinal = 1
WHERE id = '55000000-0000-0000-0001-000000000001';

UPDATE code_challenge_test_cases
SET name = 'Policy Enforcement',
    input_text = 'resource=res-2211;policy=RELAXED;tag=production',
    expected_output = 'REJECTED',
    weight = 15,
    ordinal = 2
WHERE id = '55000000-0000-0000-0001-000000000002';

UPDATE code_challenge_test_cases
SET name = 'Tag Filtering',
    visibility = 'VISIBLE',
    input_text = 'resource=res-4420;policy=STRICT;tag=staging',
    expected_output = 'REJECTED',
    weight = 10,
    ordinal = 3
WHERE id = '55000000-0000-0000-0001-000000000003';

UPDATE code_challenge_test_cases
SET name = 'Hidden strict policy guard',
    input_text = 'resource=res-hidden-1;policy=STRICT;tag=production',
    expected_output = 'PASSED',
    weight = 25,
    ordinal = 4
WHERE id = '55000000-0000-0000-0001-000000000004';

INSERT INTO code_challenge_test_cases (id, challenge_id, name, visibility, input_text, expected_output, weight, ordinal)
VALUES (
    '55000000-0000-0000-0001-000000000011',
    '52000000-0000-0000-0001-000000000001',
    'Hidden malformed resource rejection',
    'HIDDEN',
    'resource=res-hidden-2;policy=STRICT',
    'REJECTED',
    20,
    5
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    visibility = EXCLUDED.visibility,
    input_text = EXCLUDED.input_text,
    expected_output = EXCLUDED.expected_output,
    weight = EXCLUDED.weight,
    ordinal = EXCLUDED.ordinal;

WITH cloud_submission AS (
    SELECT
        E'class CandidateSolution {\n  String solve(String input) {\n    ResourceValidator validator = new ResourceValidator(EnterpriseSecurityPolicy.STRICT, "production");\n    return validator.validate(input) ? "PASSED" : "REJECTED";\n  }\n}\n\nenum EnterpriseSecurityPolicy { STRICT }\n\nclass ResourceValidator {\n  private final EnterpriseSecurityPolicy policy;\n  private final String requiredTag;\n\n  ResourceValidator(EnterpriseSecurityPolicy policy, String requiredTag) {\n    this.policy = policy;\n    this.requiredTag = requiredTag;\n  }\n\n  boolean validate(String input) {\n    return this.policy == EnterpriseSecurityPolicy.STRICT && input != null && input.contains("policy=STRICT") && input.contains("tag=" + this.requiredTag);\n  }\n}'::text AS code_text
)
UPDATE code_submissions s
SET code_text = cloud_submission.code_text,
    candidate_notes = 'Submission explains strict production resource validation and reviewer-safe test evidence.',
    code_hash = lpad(md5(cloud_submission.code_text), 64, '0'),
    feedback = 'Server-side runner evidence and rubric scoring indicate the cloud architecture submission is ready for employer review.',
    risk_flags_csv = '',
    grader_version = 'static-rubric-v1',
    rubric_version = 'devhire-code-rubric-v1'
FROM code_assessment_assignments a,
     cloud_submission
WHERE s.assignment_id = a.id
  AND a.challenge_id = '52000000-0000-0000-0001-000000000001';
