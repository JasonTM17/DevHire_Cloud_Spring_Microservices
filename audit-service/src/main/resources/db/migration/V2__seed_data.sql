INSERT INTO audit_logs (
    id, event_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, metadata, occurred_at, created_at
) VALUES
    ('60000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000003', 'candidate@devhire.local', 'CANDIDATE',
     'register', 'user', '00000000-0000-0000-0000-000000000003', '{"source": "seed"}', now(), now()),
    ('60000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000002', 'employer@devhire.local', 'EMPLOYER',
     'create company', 'company', '20000000-0000-0000-0000-000000000001', '{"company": "DevHire Labs"}', now(), now()),
    ('60000000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000003',
     '00000000-0000-0000-0000-000000000001', 'admin@devhire.local', 'ADMIN',
     'approve job', 'job', '30000000-0000-0000-0000-000000000001', '{"status": "PUBLISHED"}', now(), now()),
    ('60000000-0000-0000-0000-000000000004', '61000000-0000-0000-0000-000000000004',
     '00000000-0000-0000-0000-000000000003', 'candidate@devhire.local', 'CANDIDATE',
     'submit application', 'application', '40000000-0000-0000-0000-000000000001',
     '{"jobId": "30000000-0000-0000-0000-000000000001"}', now(), now())
ON CONFLICT (event_id) DO NOTHING;
