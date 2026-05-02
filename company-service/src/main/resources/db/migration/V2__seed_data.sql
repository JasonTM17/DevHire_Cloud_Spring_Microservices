INSERT INTO companies (
    id, employer_id, name, slug, logo_url, website, size, industry, description, status,
    rejection_reason, created_at, updated_at, version
) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'DevHire Labs', 'devhire-labs',
     'https://cdn.devhire.local/logos/devhire-labs.png', 'https://devhire.local', '51-200', 'HR Tech',
     'Recruitment platform engineering team building hiring workflow products.', 'APPROVED', NULL, now(), now(), 0),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Cloud Native Vietnam', 'cloud-native-vietnam',
     'https://cdn.devhire.local/logos/cloud-native-vietnam.png', 'https://cloudnative.example', '201-500', 'Cloud Infrastructure',
     'Platform engineering consultancy focused on Kubernetes and observability.', 'APPROVED', NULL, now(), now(), 0),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Pending Startup', 'pending-startup',
     NULL, 'https://pending.example', '1-50', 'SaaS', 'Early-stage SaaS company waiting for admin review.', 'PENDING', NULL, now(), now(), 0)
ON CONFLICT (slug) DO NOTHING;

