-- Fix RLS policies for the profiles table (not user_profiles)
-- This migration fixes the correct table that the user is actually using

-- Step 1: Enable RLS on the profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Clean up any duplicate policies on profiles table
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow insert for self" ON profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Step 3: Ensure proper policies exist for profiles table
DO $$
BEGIN
    -- Insert policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON profiles
            FOR INSERT WITH CHECK (id = auth.uid());
    END IF;
    
    -- Update policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (id = auth.uid());
    END IF;
    
    -- Select policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (id = auth.uid());
    END IF;
END $$;

-- Step 4: Remove any policies with null definitions on profiles table
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
        AND tablename = 'profiles'
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

-- Step 5: Verify the profiles table policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'profiles';
    
    RAISE NOTICE 'profiles table now has % policies', policy_count;
    
    -- List remaining policies
    FOR policy_record IN 
        SELECT policyname, cmd, qual
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % (% operation) - Definition: %', 
            policy_record.policyname, 
            policy_record.cmd,
            COALESCE(policy_record.qual, 'NULL');
    END LOOP;
END $$;

-- Step 6: Also fix the split_payment_requests table to reference profiles instead of user_profiles
-- Update the foreign key constraints if they exist
DO $$
BEGIN
    -- Check if split_payment_requests references user_profiles and update to profiles
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%split_payment_requests%' 
        AND table_name = 'split_payment_requests'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Drop existing foreign key constraints if they reference user_profiles
        ALTER TABLE split_payment_requests 
        DROP CONSTRAINT IF EXISTS split_payment_requests_requester_id_fkey;
        
        ALTER TABLE split_payment_requests 
        DROP CONSTRAINT IF EXISTS split_payment_requests_recipient_id_fkey;
        
        -- Add new foreign key constraints referencing profiles table
        ALTER TABLE split_payment_requests
        ADD CONSTRAINT split_payment_requests_requester_id_fkey
        FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        ALTER TABLE split_payment_requests
        ADD CONSTRAINT split_payment_requests_recipient_id_fkey
        FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Updated split_payment_requests foreign keys to reference profiles table';
    END IF;
END $$;

-- Step 7: Update payment_notifications table foreign key if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%payment_notifications%' 
        AND table_name = 'payment_notifications'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Drop existing foreign key constraint if it references user_profiles
        ALTER TABLE payment_notifications 
        DROP CONSTRAINT IF EXISTS payment_notifications_user_id_fkey;
        
        -- Add new foreign key constraint referencing profiles table
        ALTER TABLE payment_notifications
        ADD CONSTRAINT payment_notifications_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Updated payment_notifications foreign key to reference profiles table';
    END IF;
END $$; 