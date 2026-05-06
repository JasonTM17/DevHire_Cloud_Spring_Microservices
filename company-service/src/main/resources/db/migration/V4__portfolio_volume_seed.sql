WITH company_seed AS (
    SELECT
        i,
        ('20000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid AS company_id,
        ('10000000-0000-0000-0002-' || lpad((((i - 1) % 12) + 1)::text, 12, '0'))::uuid AS employer_id,
        (ARRAY[
            'Atlas Talent Cloud',
            'BluePeak Engineering',
            'CodeHarbor Labs',
            'DataForge Careers',
            'EdgeScale Systems',
            'FlowHire Technologies',
            'GreenStack Software',
            'Helio Platform Group',
            'InsightGrid Vietnam',
            'JetBridge Digital',
            'KiteOps Cloud',
            'LatticeWorks AI',
            'MetroScale Fintech',
            'NovaHire Systems',
            'OrbitOps Platform',
            'PrismCore Software',
            'Quantum Talent Lab',
            'RiverByte Solutions',
            'Skyline DevOps',
            'TalentMesh Cloud',
            'UnionStack SaaS',
            'VectorLoop Security',
            'Wavefront Data',
            'Zenith Recruiting Tech'
        ])[i] AS name,
        (ARRAY[
            'atlas-talent-cloud',
            'bluepeak-engineering',
            'codeharbor-labs',
            'dataforge-careers',
            'edgescale-systems',
            'flowhire-technologies',
            'greenstack-software',
            'helio-platform-group',
            'insightgrid-vietnam',
            'jetbridge-digital',
            'kiteops-cloud',
            'latticeworks-ai',
            'metroscale-fintech',
            'novahire-systems',
            'orbitops-platform',
            'prismcore-software',
            'quantum-talent-lab',
            'riverbyte-solutions',
            'skyline-devops',
            'talentmesh-cloud',
            'unionstack-saas',
            'vectorloop-security',
            'wavefront-data',
            'zenith-recruiting-tech'
        ])[i] AS slug,
        (ARRAY['HR Tech','Developer Platforms','Cloud Infrastructure','Fintech','SaaS','Cybersecurity','Data Platform','AI Products'])[((i - 1) % 8) + 1] AS industry,
        (ARRAY['1-50','51-200','201-500','501-1000','1000+'])[((i - 1) % 5) + 1] AS company_size,
        CASE
            WHEN i IN (21, 22) THEN 'PENDING'
            WHEN i = 23 THEN 'REJECTED'
            ELSE 'APPROVED'
        END AS status
    FROM generate_series(1, 24) AS i
)
INSERT INTO companies (
    id, employer_id, name, slug, logo_url, website, size, industry, description, status,
    rejection_reason, created_at, updated_at, version
)
SELECT
    company_id,
    employer_id,
    name,
    slug,
    format('https://cdn.devhire.local/logos/%s.png', slug),
    format('https://careers.devhire.local/%s', slug),
    company_size,
    industry,
    format('%s builds production recruitment, hiring analytics, and platform engineering products for distributed teams.', name),
    status,
    CASE WHEN status = 'REJECTED' THEN 'Seeded example for admin rejection workflow review.' ELSE NULL END,
    now() - ((i % 120) || ' days')::interval,
    now() - ((i % 20) || ' hours')::interval,
    0
FROM company_seed
ON CONFLICT (slug) DO NOTHING;
