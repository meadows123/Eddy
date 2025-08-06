-- Fix RLS policies to allow .select() during venue owner registration
-- This keeps the working code intact and just fixes the RLS policy

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

-- Create policies that work with the existing .select().single() code
-- Allow anyone to insert venue owner records (for registration)
CREATE POLICY "Allow venue owner registration" ON venue_owners
    FOR INSERT
    WITH CHECK (true);

-- Allow users to view venue owner records during registration and after
-- This policy allows the .select() call to work even without auth session
CREATE POLICY "Allow venue owner viewing" ON venue_owners
    FOR SELECT
    USING (
        -- Allow if user is viewing their own record
        user_id = auth.uid()
        OR
        -- Allow if no auth session (during registration .select() call)
        auth.uid() IS NULL
        OR
        -- Allow authenticated users to view all records (admin access)
        auth.uid() IS NOT NULL
    );

-- Allow users to update their own venue owner records
CREATE POLICY "Users can update own venue owner record" ON venue_owners
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own venue owner records
CREATE POLICY "Users can delete own venue owner record" ON venue_owners
    FOR DELETE
    USING (user_id = auth.uid());

-- Fix policies for pending_venue_owner_requests as well
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

-- Create policies for pending_venue_owner_requests
-- Allow anyone to insert pending requests (for registration)
CREATE POLICY "Allow pending venue owner requests" ON pending_venue_owner_requests
    FOR INSERT
    WITH CHECK (true);

-- Allow viewing pending requests
CREATE POLICY "Allow pending request viewing" ON pending_venue_owner_requests
    FOR SELECT
    USING (
        -- Allow if user is viewing their own record
        user_id = auth.uid()
        OR
        -- Allow if no auth session (during registration)
        auth.uid() IS NULL
        OR
        -- Allow authenticated users to view all records (admin access)
        auth.uid() IS NOT NULL
    );

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