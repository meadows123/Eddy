-- Test script to debug venue_tables RLS policies
-- Run this in your Supabase SQL editor to check the current state

-- 1. Check if RLS is enabled on venue_tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename = 'venue_tables';

-- 2. Check all policies on venue_tables
SELECT 
    policyname, 
    cmd as operation, 
    qual as using_clause, 
    with_check as with_check_clause 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'venue_tables' 
ORDER BY policyname;

-- 3. Check if there are any venues owned by the current user
SELECT 
    id, 
    name, 
    owner_id 
FROM venues 
WHERE owner_id = auth.uid();

-- 4. Check if there are any existing tables
SELECT COUNT(*) as table_count FROM venue_tables;

-- 5. Check the structure of venue_tables
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'venue_tables' 
ORDER BY ordinal_position;

-- 6. Test if the current user can insert a table (this will show the actual error)
-- Uncomment the line below to test the insert operation
-- INSERT INTO venue_tables (venue_id, table_number, capacity, table_type, status, price) 
-- VALUES ('test-venue-id', 'TEST1', 4, 'indoor', 'available', 100);
