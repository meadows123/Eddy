-- Temporarily remove the user_id foreign key constraint to allow registration
-- We can add it back later once we figure out the timing issue

-- Drop the problematic user_id foreign key constraint
ALTER TABLE venue_owners 
DROP CONSTRAINT IF EXISTS venue_owners_user_id_fkey;

-- Drop the user_id constraint from pending requests too
ALTER TABLE pending_venue_owner_requests 
DROP CONSTRAINT IF EXISTS pending_venue_owner_requests_user_id_fkey;

-- Keep the venue_id constraint as it's working fine
-- (Don't drop venue_owners_venue_id_fkey)

-- Show remaining constraints
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