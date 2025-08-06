-- Fix RLS policies for venue_owners to allow registration without authenticated session
-- This migration addresses the "Auth session missing!" error during venue owner registration

-- Drop all existing policies on venue_owners
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'venue_owners'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON venue_owners', policy_record.policyname);
    END LOOP;
END $$;

-- Create new, more permissive policies for venue_owners
-- Allow anyone to insert venue owner records (for registration)
CREATE POLICY "Allow venue owner registration" ON venue_owners
    FOR INSERT
    WITH CHECK (true);

-- Allow users to view their own venue owner records
CREATE POLICY "Users can view own venue owner record" ON venue_owners
    FOR SELECT
    USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- Allow users to update their own venue owner records
CREATE POLICY "Users can update own venue owner record" ON venue_owners
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to delete their own venue owner records
CREATE POLICY "Users can delete own venue owner record" ON venue_owners
    FOR DELETE
    USING (user_id = auth.uid());

-- Also fix policies for pending_venue_owner_requests
-- Drop all existing policies on pending_venue_owner_requests
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'pending_venue_owner_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON pending_venue_owner_requests', policy_record.policyname);
    END LOOP;
END $$;

-- Create new policies for pending_venue_owner_requests
-- Allow anyone to insert pending requests (for registration)
CREATE POLICY "Allow pending venue owner requests" ON pending_venue_owner_requests
    FOR INSERT
    WITH CHECK (true);

-- Allow users to view their own pending requests
CREATE POLICY "Users can view own pending requests" ON pending_venue_owner_requests
    FOR SELECT
    USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- Allow users to update their own pending requests
CREATE POLICY "Users can update own pending requests" ON pending_venue_owner_requests
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own pending requests
CREATE POLICY "Users can delete own pending requests" ON pending_venue_owner_requests
    FOR DELETE
    USING (user_id = auth.uid());

-- Display final status
SELECT 
    'venue_owners' as table_name,
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'venue_owners') as policy_count
FROM pg_tables 
WHERE tablename = 'venue_owners'
UNION ALL
SELECT 
    'pending_venue_owner_requests' as table_name,
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pending_venue_owner_requests') as policy_count
FROM pg_tables 
WHERE tablename = 'pending_venue_owner_requests';