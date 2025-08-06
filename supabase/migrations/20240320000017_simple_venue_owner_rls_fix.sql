-- Simple fix for venue_owners RLS - more permissive approach
-- This migration ensures venue owner registration works

-- Step 1: Drop ALL existing policies on venue_owners to start fresh
DROP POLICY IF EXISTS "Users can create their own venue owner record" ON venue_owners;
DROP POLICY IF EXISTS "Users can view their own venue owner record" ON venue_owners;
DROP POLICY IF EXISTS "Users can update their own venue owner record" ON venue_owners;
DROP POLICY IF EXISTS "Authenticated users can view venue owner records" ON venue_owners;
DROP POLICY IF EXISTS "Authenticated users can update venue owner records" ON venue_owners;
DROP POLICY IF EXISTS "Venue owners can manage their own records" ON venue_owners;
DROP POLICY IF EXISTS "Users can manage their own venue owner records" ON venue_owners;
DROP POLICY IF EXISTS "Authenticated users can create venue owner records" ON venue_owners;

-- Step 2: Create simple, permissive policies
-- Allow any authenticated user to insert (for registration)
CREATE POLICY "Allow authenticated users to insert venue owners" ON venue_owners
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own records
CREATE POLICY "Allow users to view own venue owner records" ON venue_owners
    FOR SELECT USING (user_id = auth.uid());

-- Allow users to update their own records
CREATE POLICY "Allow users to update own venue owner records" ON venue_owners
    FOR UPDATE USING (user_id = auth.uid());

-- Allow all authenticated users to view all records (for admin purposes)
CREATE POLICY "Allow authenticated users to view all venue owners" ON venue_owners
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Step 3: Also fix pending_venue_owner_requests table
DROP POLICY IF EXISTS "Users can create pending venue owner requests" ON pending_venue_owner_requests;
DROP POLICY IF EXISTS "Users can view their own pending requests" ON pending_venue_owner_requests;
DROP POLICY IF EXISTS "Authenticated users can view pending requests" ON pending_venue_owner_requests;
DROP POLICY IF EXISTS "Authenticated users can update pending requests" ON pending_venue_owner_requests;

-- Create simple policies for pending_venue_owner_requests
CREATE POLICY "Allow authenticated users to insert pending requests" ON pending_venue_owner_requests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to view own pending requests" ON pending_venue_owner_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Allow authenticated users to view all pending requests" ON pending_venue_owner_requests
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to update own pending requests" ON pending_venue_owner_requests
    FOR UPDATE USING (user_id = auth.uid());

-- Step 4: Verify RLS is enabled
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
END $$; 