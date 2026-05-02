INSERT INTO user_profiles (
    user_id, email, role, name, title, skills_csv, experience, education, expected_salary,
    company_position, contact_info, avatar_url, created_at, updated_at, version
) VALUES
    ('00000000-0000-0000-0000-000000000002', 'employer@devhire.local', 'EMPLOYER', 'DevHire Employer', 'Talent Acquisition Lead', NULL, NULL, NULL, NULL,
     'Recruitment Manager', 'employer@devhire.local', 'https://cdn.devhire.local/avatars/employer.png', now(), now(), 0),
    ('00000000-0000-0000-0000-000000000003', 'candidate@devhire.local', 'CANDIDATE', 'DevHire Candidate', 'Java Backend Engineer', 'Java,Spring Boot,PostgreSQL,Kafka',
     '5 years building backend platforms and distributed systems.', 'B.S. Computer Science', 3500.00, NULL, NULL,
     'https://cdn.devhire.local/avatars/candidate.png', now(), now(), 0),
    ('10000000-0000-0000-0000-000000000001', 'linh.nguyen@devhire.local', 'CANDIDATE', 'Linh Nguyen', 'Senior Java Engineer', 'Java,Spring Cloud,Docker,AWS',
     '7 years in fintech and hiring platforms.', 'HCMUT', 5000.00, NULL, NULL, NULL, now(), now(), 0),
    ('10000000-0000-0000-0000-000000000002', 'minh.tran@devhire.local', 'CANDIDATE', 'Minh Tran', 'Full Stack Developer', 'Java,React,TypeScript,PostgreSQL',
     '4 years delivering product teams.', 'University of Science', 3200.00, NULL, NULL, NULL, now(), now(), 0),
    ('10000000-0000-0000-0000-000000000003', 'anh.pham@devhire.local', 'CANDIDATE', 'Anh Pham', 'DevOps Engineer', 'Kubernetes,Terraform,Prometheus,Java',
     '6 years operating cloud-native systems.', 'FPT University', 4500.00, NULL, NULL, NULL, now(), now(), 0),
    ('10000000-0000-0000-0000-000000000004', 'hoa.le@devhire.local', 'CANDIDATE', 'Hoa Le', 'Backend Engineer', 'Java,Spring Boot,Redis,Kafka',
     '3 years on high-throughput APIs.', 'Da Nang University', 2800.00, NULL, NULL, NULL, now(), now(), 0)
ON CONFLICT (user_id) DO NOTHING;

