UPDATE code_challenge_test_cases
SET name = 'Private validation case A'
WHERE challenge_id = '52000000-0000-0000-0001-000000000001'
  AND name = 'Hidden strict policy guard';

UPDATE code_challenge_test_cases
SET name = 'Private validation case B'
WHERE challenge_id = '52000000-0000-0000-0001-000000000001'
  AND name = 'Hidden malformed resource rejection';
