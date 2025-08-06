-- Create a deferred foreign key constraint to handle timing issues during registration
-- This allows the insert to succeed and validates the foreign key at transaction commit

-- First, let's temporarily disable the foreign key constraint
ALTER TABLE venue_owners 
DROP CONSTRAINT IF EXISTS venue_owners_user_id_fkey;

-- Create a deferred foreign key constraint that checks at transaction commit
-- This allows the insert to succeed and validates the foreign key later
ALTER TABLE venue_owners 
ADD CONSTRAINT venue_owners_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- Do the same for pending_venue_owner_requests
ALTER TABLE pending_venue_owner_requests 
DROP CONSTRAINT IF EXISTS pending_venue_owner_requests_user_id_fkey;

ALTER TABLE pending_venue_owner_requests 
ADD CONSTRAINT pending_venue_owner_requests_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Verify the constraints are now deferred
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    a.attname as column_name,
    confrelid::regclass as foreign_table_name,
    af.attname as foreign_column_name,
    condeferrable as is_deferrable,
    condeferred as is_deferred
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid IN ('venue_owners'::regclass, 'pending_venue_owner_requests'::regclass)
AND c.contype = 'f'
AND a.attname = 'user_id'
ORDER BY table_name, constraint_name;