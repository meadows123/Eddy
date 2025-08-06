-- Fix venue_owners foreign key constraint issue
-- The error suggests the foreign key is referencing a 'users' table instead of 'auth.users'

-- Step 1: Check current foreign key constraints
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    RAISE NOTICE '=== Current foreign key constraints on venue_owners ===';
    FOR fk_record IN 
        SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'venue_owners'
    LOOP
        RAISE NOTICE 'FK: % -> %.%', 
            fk_record.column_name, 
            fk_record.foreign_table_name, 
            fk_record.foreign_column_name;
    END LOOP;
END $$;

-- Step 2: Drop the problematic foreign key constraint
ALTER TABLE venue_owners DROP CONSTRAINT IF EXISTS venue_owners_user_id_fkey;

-- Step 3: Add the correct foreign key constraint to auth.users
ALTER TABLE venue_owners 
ADD CONSTRAINT venue_owners_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 4: Also fix pending_venue_owner_requests if it has the same issue
ALTER TABLE pending_venue_owner_requests DROP CONSTRAINT IF EXISTS pending_venue_owner_requests_user_id_fkey;

ALTER TABLE pending_venue_owner_requests 
ADD CONSTRAINT pending_venue_owner_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 5: Verify the fix
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    RAISE NOTICE '=== Updated foreign key constraints on venue_owners ===';
    FOR fk_record IN 
        SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'venue_owners'
    LOOP
        RAISE NOTICE 'FK: % -> %.%', 
            fk_record.column_name, 
            fk_record.foreign_table_name, 
            fk_record.foreign_column_name;
    END LOOP;
END $$; 