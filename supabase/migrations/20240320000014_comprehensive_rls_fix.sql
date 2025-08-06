-- Comprehensive RLS Fix
-- This migration fixes all RLS-related issues

-- Step 1: Enable RLS on all tables that need it
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_venue_owner_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Step 2: Fix auth.users access issues in split_payment_requests
DROP POLICY IF EXISTS "Users can view their own split payment requests" ON split_payment_requests;
CREATE POLICY "Users can view their own split payment requests" ON split_payment_requests
    FOR SELECT USING (
        requester_id = auth.uid() OR 
        recipient_id = auth.uid()
    );

-- Step 3: Clean up duplicate policies on user_profiles
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Allow insert for self" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;

-- Step 4: Ensure proper policies exist for user_profiles
DO $$
BEGIN
    -- Insert policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON user_profiles
            FOR INSERT WITH CHECK (id = auth.uid());
    END IF;
    
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

-- Step 5: Remove any policies with null definitions
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

-- Step 6: Verify all tables have RLS enabled and proper policies
DO $$
DECLARE
    table_record RECORD;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '=== RLS Status Report ===';
    
    FOR table_record IN 
        SELECT 
            tablename,
            rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
        ORDER BY tablename
    LOOP
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename = table_record.tablename;
        
        RAISE NOTICE 'Table: % - RLS: % - Policies: %', 
            table_record.tablename, 
            CASE WHEN table_record.rls_enabled THEN 'ENABLED' ELSE 'DISABLED' END,
            policy_count;
    END LOOP;
    
    RAISE NOTICE '=== End Report ===';
END $$; 