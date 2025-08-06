-- Fix RLS policies that are trying to access auth.users table
-- This migration removes problematic references to auth.users in RLS policies

-- Drop the problematic policy that references auth.users from split_payment_requests
DROP POLICY IF EXISTS "Users can view their own split payment requests" ON split_payment_requests;

-- Recreate the policy without the auth.users reference
CREATE POLICY "Users can view their own split payment requests" ON split_payment_requests
    FOR SELECT USING (
        requester_id = auth.uid() OR 
        recipient_id = auth.uid()
    );

-- Also check and fix any other policies that might reference auth.users
-- Let's check if there are any other policies with problematic references
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Check for policies that might reference auth.users
    FOR policy_record IN 
        SELECT 
            schemaname,
            tablename,
            policyname,
            qual
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND qual LIKE '%auth.users%'
    LOOP
        RAISE NOTICE 'Found policy referencing auth.users: %.%.% - %', 
            policy_record.schemaname, 
            policy_record.tablename, 
            policy_record.policyname,
            policy_record.qual;
    END LOOP;
END $$;

-- Create a function to get user email safely (if needed)
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- This function can be used if you need to get user email in policies
    -- But it should be used carefully and only when necessary
    RETURN NULL; -- For now, return NULL to avoid auth.users access
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_email(UUID) TO authenticated;

-- Alternative approach: If you need to match by email, you can store the email in the profiles table
-- and query that instead of auth.users. For now, we'll remove the email matching from the policy.

-- Note: The foreign key references to auth.users(id) in table definitions are fine
-- The problem is only with RLS policies trying to SELECT from auth.users table 