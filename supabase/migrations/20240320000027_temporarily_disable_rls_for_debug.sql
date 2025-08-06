-- Temporarily disable RLS on venue_owners and pending_venue_owner_requests for debugging
-- This will help us determine if the issue is with RLS policies or the application code

-- Disable RLS on venue_owners temporarily
ALTER TABLE venue_owners DISABLE ROW LEVEL SECURITY;

-- Disable RLS on pending_venue_owner_requests temporarily  
ALTER TABLE pending_venue_owner_requests DISABLE ROW LEVEL SECURITY;

-- Check status
SELECT 
    'venue_owners' as table_name,
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'venue_owners'
UNION ALL
SELECT 
    'pending_venue_owner_requests' as table_name,
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'pending_venue_owner_requests';