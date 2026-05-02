INSERT INTO job_applications (
    id, job_id, company_id, employer_id, candidate_id, job_title, cv_url, cover_letter,
    status, created_at, updated_at, version
) VALUES
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000003', 'Senior Java Backend Engineer',
     'https://cdn.devhire.local/cv/candidate-java.pdf', 'I have built similar systems using Spring Boot and Kafka.',
     'REVIEWING', now(), now(), 0),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003',
     '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000002', 'Full Stack Java React Developer',
     'https://cdn.devhire.local/cv/minh-tran.pdf', 'I enjoy full stack product delivery.',
     'SUBMITTED', now(), now(), 0),
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004',
     '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000003', 'DevOps Engineer',
     'https://cdn.devhire.local/cv/anh-pham.pdf', 'I can improve CI/CD and observability.',
     'INTERVIEW', now(), now(), 0)
ON CONFLICT (candidate_id, job_id) DO NOTHING;

INSERT INTO application_status_history (
    application_id, old_status, new_status, changed_by, changed_by_role, note, created_at
) VALUES
    ('40000000-0000-0000-0000-000000000001', NULL, 'SUBMITTED', '00000000-0000-0000-0000-000000000003', 'CANDIDATE', 'Application submitted', now()),
    ('40000000-0000-0000-0000-000000000001', 'SUBMITTED', 'REVIEWING', '00000000-0000-0000-0000-000000000002', 'EMPLOYER', 'Screening started', now()),
    ('40000000-0000-0000-0000-000000000002', NULL, 'SUBMITTED', '10000000-0000-0000-0000-000000000002', 'CANDIDATE', 'Application submitted', now()),
    ('40000000-0000-0000-0000-000000000003', NULL, 'SUBMITTED', '10000000-0000-0000-0000-000000000003', 'CANDIDATE', 'Application submitted', now()),
    ('40000000-0000-0000-0000-000000000003', 'SUBMITTED', 'INTERVIEW', '00000000-0000-0000-0000-000000000002', 'EMPLOYER', 'Interview scheduled', now());

