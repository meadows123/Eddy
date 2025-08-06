-- Check current RLS status and policies for venue_owners table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'venue_owners';

-- Check current policies
SELECT 
    policyname,
    cmd as operation,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'venue_owners'
ORDER BY policyname;

-- Check if venue_owners table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'venue_owners' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test current user context
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role; 