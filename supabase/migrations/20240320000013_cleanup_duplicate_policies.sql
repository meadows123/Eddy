-- Clean up duplicate and problematic RLS policies
-- This migration removes duplicate policies and fixes null definitions

-- Clean up user_profiles table policies
-- Remove duplicate INSERT policies
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Allow insert for self" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;

-- Keep only the properly defined INSERT policy
-- If it doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON user_profiles
            FOR INSERT WITH CHECK (id = auth.uid());
    END IF;
END $$;

-- Ensure the UPDATE and SELECT policies are properly defined
DO $$
BEGIN
    -- Update policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON user_profiles
            FOR UPDATE USING (id = auth.uid());
    END IF;
    
    -- Select policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON user_profiles
            FOR SELECT USING (id = auth.uid());
    END IF;
END $$;

-- Clean up any other policies with null definitions
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT 
            schemaname,
            tablename,
            policyname,
            cmd
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND (qual IS NULL OR qual = '')
        AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    LOOP
        RAISE NOTICE 'Removing policy with null definition: %.%.% (% operation)', 
            policy_record.schemaname, 
            policy_record.tablename, 
            policy_record.policyname,
            policy_record.cmd;
            
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
            policy_record.policyname, 
            policy_record.tablename);
    END LOOP;
END $$;

-- Verify the cleanup
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles';
    
    RAISE NOTICE 'user_profiles table now has % policies', policy_count;
    
    -- List remaining policies
    FOR policy_record IN 
        SELECT policyname, cmd, qual
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename = 'user_profiles'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % (% operation) - Definition: %', 
            policy_record.policyname, 
            policy_record.cmd,
            COALESCE(policy_record.qual, 'NULL');
    END LOOP;
END $$; 