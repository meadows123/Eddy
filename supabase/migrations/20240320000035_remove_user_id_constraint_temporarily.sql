-- Temporarily remove the user_id foreign key constraints to allow registration
-- We'll add validation at the application level and can add constraints back later

-- Remove the foreign key constraints that are causing the timing issue
ALTER TABLE venue_owners 
DROP CONSTRAINT IF EXISTS venue_owners_user_id_fkey;

ALTER TABLE pending_venue_owner_requests 
DROP CONSTRAINT IF EXISTS pending_venue_owner_requests_user_id_fkey;

-- Keep the venue_id constraint as it's working fine
-- (venue_owners_venue_id_fkey should remain)

-- Show remaining constraints to confirm
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    a.attname as column_name,
    confrelid::regclass as foreign_table_name,
    af.attname as foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid IN ('venue_owners'::regclass, 'pending_venue_owner_requests'::regclass)
AND c.contype = 'f'
ORDER BY table_name, constraint_name;

-- Add a comment to track this change
COMMENT ON TABLE venue_owners IS 'user_id foreign key constraint temporarily removed for registration timing issues';
COMMENT ON TABLE pending_venue_owner_requests IS 'user_id foreign key constraint temporarily removed for registration timing issues';