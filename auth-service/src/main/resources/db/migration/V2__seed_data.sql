INSERT INTO user_accounts (id, email, password_hash, role, enabled, created_at, updated_at, version)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@devhire.local', '$2a$10$wwCzF.xaDiTXuTbWO98hyeT6Hr4N4ZOznNSTslB2MDc7sAIDCr5..', 'ADMIN', TRUE, now(), now(), 0),
    ('00000000-0000-0000-0000-000000000002', 'employer@devhire.local', '$2a$10$mhBbSraaf9uWWYiwyo/hae9lcMO/uof0awc/sTYwXQKJ6N46e0D7u', 'EMPLOYER', TRUE, now(), now(), 0),
    ('00000000-0000-0000-0000-000000000003', 'candidate@devhire.local', '$2a$10$iBit.pjXNnLmJ1KcJyKev.3iFMuLJAtDAT0iz7MQ3XojsqzpvzqHe', 'CANDIDATE', TRUE, now(), now(), 0)
ON CONFLICT (email) DO NOTHING;

