INSERT INTO notifications (
    id, recipient_id, type, title, message, read_at, created_at, updated_at, version
) VALUES
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
     'APPLICATION_SUBMITTED', 'New application received',
     'A candidate applied to Senior Java Backend Engineer', NULL, now(), now(), 0),
    ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
     'APPLICATION_STATUS_CHANGED', 'Application status updated',
     'Your application status changed from SUBMITTED to REVIEWING', now(), now(), now(), 0),
    ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
     'APPLICATION_STATUS_CHANGED', 'Application status updated',
     'Your application status changed from SUBMITTED to INTERVIEW', NULL, now(), now(), 0)
ON CONFLICT (id) DO NOTHING;
