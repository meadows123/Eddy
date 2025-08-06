-- Fix foreign key constraint timing issues by making them deferred
-- Deferred constraints are checked at transaction commit, not immediately

-- Drop existing foreign key constraints
ALTER TABLE venue_owners 
DROP CONSTRAINT IF EXISTS venue_owners_user_id_fkey;

ALTER TABLE pending_venue_owner_requests 
DROP CONSTRAINT IF EXISTS pending_venue_owner_requests_user_id_fkey;

-- Add deferred foreign key constraints
-- These will be validated at transaction commit, allowing for timing issues
ALTER TABLE venue_owners 
ADD CONSTRAINT venue_owners_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE pending_venue_owner_requests 
ADD CONSTRAINT pending_venue_owner_requests_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Verify the constraints
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    condeferrable as is_deferrable,
    condeferred as is_deferred
FROM pg_constraint 
WHERE conrelid IN ('venue_owners'::regclass, 'pending_venue_owner_requests'::regclass)
AND contype = 'f'
AND conname LIKE '%user_id%';