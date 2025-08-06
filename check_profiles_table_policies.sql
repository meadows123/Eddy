-- Check current RLS policies for the profiles table
-- Run this in Supabase SQL Editor to see what policies exist

SELECT 
    policyname,
    cmd as operation,
    qual as condition,
    with_check as check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'profiles'
ORDER BY policyname;

-- Also check if RLS is enabled on the profiles table
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- Check if there are any policies that reference auth.users
SELECT 
    schemaname,
    tablename,
    policyname,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND qual LIKE '%auth.users%';

-- Check the structure of the profiles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position; 