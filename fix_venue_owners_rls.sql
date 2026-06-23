-- Fix venue_owners RLS policies - ensure only one SELECT policy
-- This script will drop all SELECT policies and create a single working one

-- Step 1: Drop ALL existing SELECT policies on venue_owners
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'venue_owners'
        AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON venue_owners', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 2: Create a single SELECT policy that works
-- This allows users to see their own records OR records with NULL user_id (for migration)
CREATE POLICY "Allow venue owner viewing" ON venue_owners
    FOR SELECT
    TO public
    USING (
        (user_id = auth.uid()) 
        OR 
        (user_id IS NULL AND auth.uid() IS NOT NULL)
    );

-- Step 3: Verify the policy was created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'venue_owners'
    AND cmd = 'SELECT';
    
    RAISE NOTICE 'Total SELECT policies after fix: %', policy_count;
    
    IF policy_count != 1 THEN
        RAISE WARNING 'Expected 1 SELECT policy, but found %', policy_count;
    ELSE
        RAISE NOTICE '✅ Successfully created single SELECT policy';
    END IF;
END $$;

