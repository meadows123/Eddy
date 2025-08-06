-- Check current RLS policies on venue_owners table
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename = 'venue_owners';

-- Check all policies on venue_owners
SELECT 
    policyname, 
    cmd as operation, 
    qual as using_clause, 
    with_check as with_check_clause 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'venue_owners' 
ORDER BY policyname;

-- Check foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'venue_owners';