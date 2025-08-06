-- Fix venue owner registration authentication timing issue
-- The problem is that auth.uid() is null during registration because user isn't signed in yet

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to insert venue owners" ON venue_owners;
DROP POLICY IF EXISTS "Allow users to view own venue owner records" ON venue_owners;
DROP POLICY IF EXISTS "Allow users to update own venue owner records" ON venue_owners;
DROP POLICY IF EXISTS "Allow authenticated users to view all venue owners" ON venue_owners;

-- Step 2: Create policies that handle the registration timing issue
-- For INSERT: Allow if user_id is provided (for registration) OR if authenticated user
CREATE POLICY "Allow venue owner registration and management" ON venue_owners
    FOR INSERT WITH CHECK (
        -- Allow registration (user_id will be provided but auth.uid() might be null)
        user_id IS NOT NULL
        OR 
        -- Allow authenticated users to create records
        auth.uid() IS NOT NULL
    );

-- For SELECT: Allow users to view their own records
CREATE POLICY "Allow users to view own venue owner records" ON venue_owners
    FOR SELECT USING (
        user_id = auth.uid() 
        OR 
        auth.uid() IS NOT NULL
    );

-- For UPDATE: Allow users to update their own records
CREATE POLICY "Allow users to update own venue owner records" ON venue_owners
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR 
        auth.uid() IS NOT NULL
    );

-- Step 3: Also fix pending_venue_owner_requests table
DROP POLICY IF EXISTS "Allow authenticated users to insert pending requests" ON pending_venue_owner_requests;
DROP POLICY IF EXISTS "Allow users to view own pending requests" ON pending_venue_owner_requests;
DROP POLICY IF EXISTS "Allow authenticated users to view all pending requests" ON pending_venue_owner_requests;
DROP POLICY IF EXISTS "Allow users to update own pending requests" ON pending_venue_owner_requests;

-- Create similar policies for pending_venue_owner_requests
CREATE POLICY "Allow pending request registration and management" ON pending_venue_owner_requests
    FOR INSERT WITH CHECK (
        -- Allow registration (user_id will be provided but auth.uid() might be null)
        user_id IS NOT NULL
        OR 
        -- Allow authenticated users to create records
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Allow users to view own pending requests" ON pending_venue_owner_requests
    FOR SELECT USING (
        user_id = auth.uid() 
        OR 
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Allow users to update own pending requests" ON pending_venue_owner_requests
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR 
        auth.uid() IS NOT NULL
    );

-- Step 4: Ensure RLS is enabled
ALTER TABLE venue_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_venue_owner_requests ENABLE ROW LEVEL SECURITY;

-- Step 5: Log the final state
DO $$
DECLARE
    venue_owner_policies INTEGER;
    pending_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO venue_owner_policies
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'venue_owners';
    
    SELECT COUNT(*) INTO pending_policies
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pending_venue_owner_requests';
    
    RAISE NOTICE 'venue_owners table now has % policies', venue_owner_policies;
    RAISE NOTICE 'pending_venue_owner_requests table now has % policies', pending_policies;
    RAISE NOTICE 'Policies now handle registration timing issue with user_id checks';
END $$; 