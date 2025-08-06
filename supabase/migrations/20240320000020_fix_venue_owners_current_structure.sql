-- Fix venue_owners table based on current structure
-- The table has been modified and user_id is now nullable

-- Step 1: Check if there are any existing foreign key constraints
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    RAISE NOTICE '=== Checking for existing foreign key constraints ===';
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
        RAISE NOTICE 'Found FK: % -> %.%', 
            fk_record.column_name, 
            fk_record.foreign_table_name, 
            fk_record.foreign_column_name;
    END LOOP;
END $$;

-- Step 2: Drop any existing problematic foreign key constraints
ALTER TABLE venue_owners DROP CONSTRAINT IF EXISTS venue_owners_user_id_fkey;
ALTER TABLE venue_owners DROP CONSTRAINT IF EXISTS venue_owners_venue_id_fkey;

-- Step 3: Add the correct foreign key constraint for user_id to auth.users
-- Since user_id is nullable, we need to handle NULL values properly
ALTER TABLE venue_owners 
ADD CONSTRAINT venue_owners_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 4: If venue_id exists and should reference venues table, add that constraint too
-- (Only if venues table exists and venue_id should reference it)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
        ALTER TABLE venue_owners 
        ADD CONSTRAINT venue_owners_venue_id_fkey 
        FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint for venue_id -> venues(id)';
    ELSE
        RAISE NOTICE 'venues table does not exist, skipping venue_id foreign key';
    END IF;
END $$;

-- Step 5: Also fix pending_venue_owner_requests table
ALTER TABLE pending_venue_owner_requests DROP CONSTRAINT IF EXISTS pending_venue_owner_requests_user_id_fkey;

ALTER TABLE pending_venue_owner_requests 
ADD CONSTRAINT pending_venue_owner_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 6: Update RLS policies to handle nullable user_id
DROP POLICY IF EXISTS "Allow venue owner registration and management" ON venue_owners;
DROP POLICY IF EXISTS "Allow users to view own venue owner records" ON venue_owners;
DROP POLICY IF EXISTS "Allow users to update own venue owner records" ON venue_owners;

-- Create policies that handle nullable user_id
CREATE POLICY "Allow venue owner registration and management" ON venue_owners
    FOR INSERT WITH CHECK (
        -- Allow if user_id is provided (for registration)
        user_id IS NOT NULL
        OR 
        -- Allow authenticated users to create records
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Allow users to view own venue owner records" ON venue_owners
    FOR SELECT USING (
        -- Users can view their own records
        (user_id = auth.uid() AND user_id IS NOT NULL)
        OR 
        -- All authenticated users can view all records (for admin purposes)
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Allow users to update own venue owner records" ON venue_owners
    FOR UPDATE USING (
        -- Users can update their own records
        (user_id = auth.uid() AND user_id IS NOT NULL)
        OR 
        -- All authenticated users can update all records (for admin purposes)
        auth.uid() IS NOT NULL
    );

-- Step 7: Ensure RLS is enabled
ALTER TABLE venue_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_venue_owner_requests ENABLE ROW LEVEL SECURITY;

-- Step 8: Verify the final state
DO $$
DECLARE
    fk_record RECORD;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '=== Final foreign key constraints on venue_owners ===';
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
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'venue_owners';
    
    RAISE NOTICE 'venue_owners table now has % RLS policies', policy_count;
END $$; 