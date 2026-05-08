UPDATE code_challenges
SET slug = 'cloud-architecture-challenge',
    title = 'Cloud Architecture Challenge',
    prompt = 'Implement a custom ResourceValidator bean in the main Spring Boot application class.',
    constraints_text = 'Use @Bean, apply EnterpriseSecurityPolicy.STRICT, and validate production-tagged resources only.',
    starter_code = E'package com.devhire.cloud;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.context.annotation.Bean;\n\n@SpringBootApplication\npublic class CloudServiceApplication {\n  public static void main(String[] args) {\n    SpringApplication.run(CloudServiceApplication.class, args);\n  }\n\n  /* TODO: Implement ResourceValidator Bean here */\n  public ResourceValidator resourceValidator() {\n    return new DefaultResourceValidator();\n  }\n}',
    skills_csv = 'Java,Spring Boot,Bean Validation,Security',
    required_signals_csv = '@Bean,ResourceValidator,EnterpriseSecurityPolicy.STRICT,production,@Test,assert'
WHERE id = '52000000-0000-0000-0001-000000000001';

UPDATE code_challenge_test_cases
SET name = 'Bean Initialization',
    input_text = '@Bean ResourceValidator',
    expected_output = '@Bean,ResourceValidator',
    weight = 15,
    ordinal = 1
WHERE id = '55000000-0000-0000-0001-000000000001';

UPDATE code_challenge_test_cases
SET name = 'Policy Enforcement',
    input_text = 'EnterpriseSecurityPolicy.STRICT',
    expected_output = 'EnterpriseSecurityPolicy.STRICT,production',
    weight = 15,
    ordinal = 2
WHERE id = '55000000-0000-0000-0001-000000000002';

UPDATE code_challenge_test_cases
SET name = 'Tag Filtering',
    visibility = 'VISIBLE',
    input_text = 'production resources only',
    expected_output = 'ResourceValidator,production',
    weight = 10,
    ordinal = 3
WHERE id = '55000000-0000-0000-0001-000000000003';

UPDATE code_challenge_test_cases
SET name = 'Hidden strict policy guard',
    input_text = 'hidden strict resource validation',
    expected_output = 'EnterpriseSecurityPolicy.STRICT,@Test,assert',
    weight = 25,
    ordinal = 4
WHERE id = '55000000-0000-0000-0001-000000000004';

INSERT INTO code_challenge_test_cases (id, challenge_id, name, visibility, input_text, expected_output, weight, ordinal)
VALUES (
    '55000000-0000-0000-0001-000000000011',
    '52000000-0000-0000-0001-000000000001',
    'Hidden reviewer evidence',
    'HIDDEN',
    'hidden assertion evidence',
    '@Test,assert,ResourceValidator',
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
        E'package com.devhire.cloud;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.context.annotation.Bean;\n\n@SpringBootApplication\npublic class CloudServiceApplication {\n\n  public static void main(String[] args) {\n    SpringApplication.run(CloudServiceApplication.class, args);\n  }\n\n  @Bean\n  public ResourceValidator resourceValidator() {\n    return new ResourceValidator(EnterpriseSecurityPolicy.STRICT, "production");\n  }\n\n  @Test\n  void validatesProductionResourcesWithStrictPolicy() {\n    assert resourceValidator().policy() == EnterpriseSecurityPolicy.STRICT;\n  }\n}'::text AS code_text
)
UPDATE code_submissions s
SET code_text = cloud_submission.code_text,
    candidate_notes = 'Submission explains strict production resource validation and reviewer-safe test evidence.',
    code_hash = lpad(md5(cloud_submission.code_text), 64, '0'),
    feedback = 'Reviewer-safe deterministic rubric indicates the cloud architecture submission is ready for employer review.',
    risk_flags_csv = '',
    grader_version = 'static-rubric-v1',
    rubric_version = 'devhire-code-rubric-v1'
FROM code_assessment_assignments a,
     cloud_submission
WHERE s.assignment_id = a.id
  AND a.challenge_id = '52000000-0000-0000-0001-000000000001';
