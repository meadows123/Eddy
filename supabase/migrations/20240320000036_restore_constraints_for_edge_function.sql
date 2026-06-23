-- Restore foreign key constraints since Edge Function handles timing properly
-- The Edge Function uses admin privileges and ensures proper transaction handling

-- First drop any existing constraints to clean slate
ALTER TABLE venue_owners 
DROP CONSTRAINT IF EXISTS venue_owners_user_id_fkey;

ALTER TABLE pending_venue_owner_requests 
DROP CONSTRAINT IF EXISTS pending_venue_owner_requests_user_id_fkey;

-- Add back proper foreign key constraints
ALTER TABLE venue_owners 
ADD CONSTRAINT venue_owners_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

ALTER TABLE pending_venue_owner_requests 
ADD CONSTRAINT pending_venue_owner_requests_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Verify constraints are in place
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