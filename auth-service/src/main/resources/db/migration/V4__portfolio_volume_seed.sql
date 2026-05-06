WITH employer_seed AS (
    SELECT
        i,
        ('10000000-0000-0000-0002-' || lpad(i::text, 12, '0'))::uuid AS user_id,
        format('employer%02s@devhire.local', i) AS email
    FROM generate_series(1, 12) AS i
)
INSERT INTO user_accounts (id, email, password_hash, role, enabled, created_at, updated_at, version)
SELECT
    user_id,
    email,
    '$2a$10$mhBbSraaf9uWWYiwyo/hae9lcMO/uof0awc/sTYwXQKJ6N46e0D7u',
    'EMPLOYER',
    TRUE,
    now() - ((i % 30) || ' days')::interval,
    now() - ((i % 6) || ' hours')::interval,
    0
FROM employer_seed
ON CONFLICT (email) DO NOTHING;

WITH candidate_seed AS (
    SELECT
        i,
        ('10000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS user_id,
        lower(format('%s.%s%02s@devhire.local',
            (ARRAY['an','bao','chi','duy','giang','ha','khanh','lan','mai','nam','phuc','quang','son','thao','uyen'])[((i - 1) % 15) + 1],
            (ARRAY['nguyen','tran','pham','le','vo','dang','bui','do','ho','ngo'])[((i - 1) % 10) + 1],
            i
        )) AS email
    FROM generate_series(1, 60) AS i
)
INSERT INTO user_accounts (id, email, password_hash, role, enabled, created_at, updated_at, version)
SELECT
    user_id,
    email,
    '$2a$10$iBit.pjXNnLmJ1KcJyKev.3iFMuLJAtDAT0iz7MQ3XojsqzpvzqHe',
    'CANDIDATE',
    TRUE,
    now() - ((i % 90) || ' days')::interval,
    now() - ((i % 12) || ' hours')::interval,
    0
FROM candidate_seed
ON CONFLICT (email) DO NOTHING;
