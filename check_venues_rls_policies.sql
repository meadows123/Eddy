-- Check RLS status and policies for venues table
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename = 'venues';

-- Check all policies on venues table
SELECT 
    policyname, 
    cmd as operation, 
    qual as using_clause, 
    with_check as with_check_clause 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'venues' 
ORDER BY policyname;

-- Check if there are any existing venues
SELECT COUNT(*) as venue_count FROM venues;