WITH employer_seed AS (
    SELECT
        i,
        ('10000000-0000-0000-0002-' || lpad(i::text, 12, '0'))::uuid AS user_id,
        format('employer%02s@devhire.local', i) AS email,
        (ARRAY['Talent Partner','Engineering Hiring Lead','People Operations Manager','Technical Recruiting Lead'])[((i - 1) % 4) + 1] AS title,
        (ARRAY['Head of Engineering Hiring','Recruitment Manager','People Partner','Employer Brand Lead'])[((i - 1) % 4) + 1] AS company_position
    FROM generate_series(1, 12) AS i
)
INSERT INTO user_profiles (
    user_id, email, role, name, title, skills_csv, experience, education, expected_salary,
    company_position, contact_info, avatar_url, created_at, updated_at, version
)
SELECT
    user_id,
    email,
    'EMPLOYER',
    format('Employer Portfolio %s', lpad(i::text, 2, '0')),
    title,
    NULL,
    NULL,
    NULL,
    NULL,
    company_position,
    email,
    format('https://cdn.devhire.local/avatars/employer-%s.png', lpad(i::text, 2, '0')),
    now() - ((i % 30) || ' days')::interval,
    now() - ((i % 6) || ' hours')::interval,
    0
FROM employer_seed
ON CONFLICT (user_id) DO NOTHING;

WITH candidate_seed AS (
    SELECT
        i,
        ('10000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS user_id,
        initcap((ARRAY['an','bao','chi','duy','giang','ha','khanh','lan','mai','nam','phuc','quang','son','thao','uyen'])[((i - 1) % 15) + 1]) || ' ' ||
            initcap((ARRAY['nguyen','tran','pham','le','vo','dang','bui','do','ho','ngo'])[((i - 1) % 10) + 1]) AS full_name,
        lower(format('%s.%s%02s@devhire.local',
            (ARRAY['an','bao','chi','duy','giang','ha','khanh','lan','mai','nam','phuc','quang','son','thao','uyen'])[((i - 1) % 15) + 1],
            (ARRAY['nguyen','tran','pham','le','vo','dang','bui','do','ho','ngo'])[((i - 1) % 10) + 1],
            i
        )) AS email,
        (ARRAY[
            'Senior Java Backend Engineer',
            'Platform Engineer',
            'Cloud Native Developer',
            'Backend SRE Engineer',
            'Full Stack Java React Engineer',
            'Data Platform Engineer',
            'Security-minded Java Engineer',
            'Technical Lead'
        ])[((i - 1) % 8) + 1] AS title,
        (ARRAY[
            'Java,Spring Boot,PostgreSQL,Kafka',
            'Kubernetes,Terraform,AWS,Prometheus',
            'Java,React,TypeScript,OpenSearch',
            'Spring Cloud,Redis,Docker,GitHub Actions',
            'Kafka,Outbox,Microservices,Observability',
            'PostgreSQL,OpenSearch,Data Pipelines,Java'
        ])[((i - 1) % 6) + 1] AS skills_csv
    FROM generate_series(1, 60) AS i
)
INSERT INTO user_profiles (
    user_id, email, role, name, title, skills_csv, experience, education, expected_salary,
    company_position, contact_info, avatar_url, created_at, updated_at, version
)
SELECT
    user_id,
    email,
    'CANDIDATE',
    full_name,
    title,
    skills_csv,
    format('%s years delivering hiring, fintech, SaaS, and platform engineering systems with measurable production ownership.', 2 + (i % 9)),
    (ARRAY['HCMUT','University of Science','FPT University','Da Nang University','PTIT','Can Tho University'])[((i - 1) % 6) + 1],
    1800 + ((i % 10) * 450),
    NULL,
    NULL,
    format('https://cdn.devhire.local/avatars/candidate-%s.png', lpad(i::text, 2, '0')),
    now() - ((i % 90) || ' days')::interval,
    now() - ((i % 24) || ' hours')::interval,
    0
FROM candidate_seed
ON CONFLICT (user_id) DO NOTHING;
