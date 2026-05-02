CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    role VARCHAR(32) NOT NULL,
    name VARCHAR(120),
    title VARCHAR(160),
    skills_csv VARCHAR(1000),
    experience VARCHAR(4000),
    education VARCHAR(4000),
    expected_salary NUMERIC(14, 2),
    company_position VARCHAR(120),
    contact_info VARCHAR(500),
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_user_profiles_role CHECK (role IN ('EMPLOYER', 'CANDIDATE'))
);

CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_skills_csv ON user_profiles(skills_csv);

