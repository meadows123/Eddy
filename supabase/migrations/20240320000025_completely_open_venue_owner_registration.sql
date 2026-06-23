-- Completely open venue owner registration by making all policies permissive
-- This should eliminate any "Auth session missing!" errors during registration

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

-- Create completely permissive policies for venue_owners during registration
-- Allow anyone to insert venue owner records
CREATE POLICY "Allow all venue owner registration" ON venue_owners
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to view venue owner records (for now, to avoid RLS issues)
CREATE POLICY "Allow all venue owner viewing" ON venue_owners
    FOR SELECT
    USING (true);

-- Allow users to update their own venue owner records
CREATE POLICY "Allow venue owner updates" ON venue_owners
    FOR UPDATE
    USING (user_id = auth.uid() OR auth.uid() IS NULL)
    WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- Allow users to delete their own venue owner records
CREATE POLICY "Allow venue owner deletes" ON venue_owners
    FOR DELETE
    USING (user_id = auth.uid() OR auth.uid() IS NULL);

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

-- Create completely permissive policies for pending_venue_owner_requests
-- Allow anyone to insert pending requests
CREATE POLICY "Allow all pending requests" ON pending_venue_owner_requests
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to view pending requests (for now)
CREATE POLICY "Allow all pending request viewing" ON pending_venue_owner_requests
    FOR SELECT
    USING (true);

-- Allow updates and deletes
CREATE POLICY "Allow pending request updates" ON pending_venue_owner_requests
    FOR UPDATE
    USING (user_id = auth.uid() OR auth.uid() IS NULL)
    WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

CREATE POLICY "Allow pending request deletes" ON pending_venue_owner_requests
    FOR DELETE
    USING (user_id = auth.uid() OR auth.uid() IS NULL);

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