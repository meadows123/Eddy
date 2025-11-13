-- Fix RLS policies for venue_owners table to allow registration
-- This migration fixes the venue owner registration issue

-- Step 1: Check current policies on venue_owners table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== Current venue_owners policies ===';
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename = 'venue_owners'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % (% operation) - Using: % - With Check: %', 
            policy_record.policyname, 
            policy_record.cmd,
            COALESCE(policy_record.qual, 'NULL'),
            COALESCE(policy_record.with_check, 'NULL');
    END LOOP;
END $$;

-- Step 2: Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Venue owners can manage their own records" ON venue_owners;
DROP POLICY IF EXISTS "Users can manage their own venue owner records" ON venue_owners;
DROP POLICY IF EXISTS "Authenticated users can create venue owner records" ON venue_owners;

-- Step 3: Create proper policies for venue_owners table
-- Allow users to create their own venue owner record during registration
CREATE POLICY "Users can create their own venue owner record" ON venue_owners
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to view their own venue owner record
CREATE POLICY "Users can view their own venue owner record" ON venue_owners
    FOR SELECT USING (user_id = auth.uid());

-- Allow users to update their own venue owner record
CREATE POLICY "Users can update their own venue owner record" ON venue_owners
    FOR UPDATE USING (user_id = auth.uid());

-- Allow all authenticated users to view venue owner records (for now)
-- You can add admin checks later if you add a role column to profiles
CREATE POLICY "Authenticated users can view venue owner records" ON venue_owners
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to update venue owner records (for now)
-- You can add admin checks later if you add a role column to profiles
CREATE POLICY "Authenticated users can update venue owner records" ON venue_owners
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Step 4: Also fix pending_venue_owner_requests table if needed
-- Allow users to create pending requests during registration
DROP POLICY IF EXISTS "Users can create pending venue owner requests" ON pending_venue_owner_requests;
CREATE POLICY "Users can create pending venue owner requests" ON pending_venue_owner_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to view their own pending requests
CREATE POLICY "Users can view their own pending requests" ON pending_venue_owner_requests
    FOR SELECT USING (user_id = auth.uid());

-- Allow all authenticated users to view pending requests (for now)
-- You can add admin checks later if you add a role column to profiles
CREATE POLICY "Authenticated users can view pending requests" ON pending_venue_owner_requests
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to update pending requests (for now)
-- You can add admin checks later if you add a role column to profiles
CREATE POLICY "Authenticated users can update pending requests" ON pending_venue_owner_requests
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Step 5: Verify the policies
DO $$
DECLARE
    policy_count INTEGER;
    final_policy_record RECORD;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'venue_owners';
    
    RAISE NOTICE 'venue_owners table now has % policies', policy_count;
    
    -- List remaining policies
    FOR final_policy_record IN 
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename = 'venue_owners'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % (% operation) - Using: % - With Check: %', 
            final_policy_record.policyname, 
            final_policy_record.cmd,
            COALESCE(final_policy_record.qual, 'NULL'),
            COALESCE(final_policy_record.with_check, 'NULL');
    END LOOP;
END $$; 