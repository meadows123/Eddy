-- Check current RLS policies for split_payment_requests
-- Run this in Supabase SQL Editor to see what policies exist

SELECT 
    policyname,
    cmd as operation,
    qual as condition,
    with_check as check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'split_payment_requests'
ORDER BY policyname;

-- Also check if RLS is enabled on the table
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename = 'split_payment_requests';

-- Check if there are any policies that reference auth.users
SELECT 
    schemaname,
    tablename,
    policyname,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND qual LIKE '%auth.users%'; 