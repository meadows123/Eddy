-- Fix the foreign key constraint that's looking for 'users' instead of 'auth.users'
-- This addresses the error: Key (user_id)=(...) is not present in table "users"

-- First, let's check what foreign key constraints exist
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('venue_owners', 'pending_venue_owner_requests');

-- Drop the problematic foreign key constraint on venue_owners.user_id
ALTER TABLE venue_owners 
DROP CONSTRAINT IF EXISTS venue_owners_user_id_fkey;

-- Drop any other user_id foreign key constraints
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT constraint_name
        FROM information_schema.table_constraints 
        WHERE table_name = 'venue_owners' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%user_id%'
    LOOP
        EXECUTE format('ALTER TABLE venue_owners DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
    END LOOP;
END $$;

-- Add the correct foreign key constraint pointing to auth.users
ALTER TABLE venue_owners 
ADD CONSTRAINT venue_owners_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Do the same for pending_venue_owner_requests
ALTER TABLE pending_venue_owner_requests 
DROP CONSTRAINT IF EXISTS pending_venue_owner_requests_user_id_fkey;

-- Drop any other user_id foreign key constraints on pending requests
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT constraint_name
        FROM information_schema.table_constraints 
        WHERE table_name = 'pending_venue_owner_requests' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%user_id%'
    LOOP
        EXECUTE format('ALTER TABLE pending_venue_owner_requests DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
    END LOOP;
END $$;

-- Add the correct foreign key constraint for pending requests
ALTER TABLE pending_venue_owner_requests 
ADD CONSTRAINT pending_venue_owner_requests_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Verify the final constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('venue_owners', 'pending_venue_owner_requests')
AND kcu.column_name = 'user_id';