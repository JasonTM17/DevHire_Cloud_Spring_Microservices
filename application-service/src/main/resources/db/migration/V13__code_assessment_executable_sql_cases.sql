ALTER TABLE code_challenge_test_cases
    ADD COLUMN IF NOT EXISTS setup_sql TEXT,
    ADD COLUMN IF NOT EXISTS expected_rows_json TEXT;

UPDATE code_challenges
SET active = true
WHERE id = '52000000-0000-0000-0001-000000000001'::uuid;

UPDATE code_challenges
SET active = false
WHERE id IN (
    '52000000-0000-0000-0001-000000000002'::uuid,
    '52000000-0000-0000-0001-000000000003'::uuid
);

UPDATE code_challenge_test_cases
SET setup_sql = CASE
        WHEN challenge_id = '52000000-0000-0000-0001-000000000002'::uuid THEN NULL
        ELSE setup_sql
    END,
    expected_rows_json = CASE
        WHEN challenge_id = '52000000-0000-0000-0001-000000000002'::uuid THEN NULL
        ELSE expected_rows_json
    END;
