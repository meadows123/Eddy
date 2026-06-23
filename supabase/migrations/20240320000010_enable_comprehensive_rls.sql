-- Comprehensive RLS Migration
-- This migration ensures all tables have proper Row Level Security enabled

-- First, let's check and enable RLS on any tables that might not have it
-- Note: We'll use IF NOT EXISTS to avoid errors if RLS is already enabled

-- Enable RLS on venue_owners table (if it exists and doesn't have RLS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_owners') THEN
        ALTER TABLE venue_owners ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for venue_owners if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_owners' AND policyname = 'Venue owners can manage their own records') THEN
            CREATE POLICY "Venue owners can manage their own records" ON venue_owners
                FOR ALL USING (user_id = auth.uid());
        END IF;
    END IF;
END $$;

-- Enable RLS on profiles table (if it exists and doesn't have RLS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for profiles if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
            CREATE POLICY "Users can view own profile" ON profiles
                FOR SELECT USING (id = auth.uid());
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
            CREATE POLICY "Users can update own profile" ON profiles
                FOR UPDATE USING (id = auth.uid());
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
            CREATE POLICY "Users can insert own profile" ON profiles
                FOR INSERT WITH CHECK (id = auth.uid());
        END IF;
    END IF;
END $$;

-- Ensure all existing tables have proper RLS policies
-- This section adds any missing policies that might be needed

-- Venues: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
        -- Add policy for venue owners to manage their venues if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venues' AND policyname = 'Venue owners can manage their venues') THEN
            CREATE POLICY "Venue owners can manage their venues" ON venues
                FOR ALL USING (owner_id = auth.uid());
        END IF;
        
        -- Add policy for public read access if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venues' AND policyname = 'Venues are viewable by everyone') THEN
            CREATE POLICY "Venues are viewable by everyone" ON venues
                FOR SELECT USING (true);
        END IF;
    END IF;
END $$;

-- Bookings: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        -- Add policy for users to manage their own bookings if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can manage their own bookings') THEN
            CREATE POLICY "Users can manage their own bookings" ON bookings
                FOR ALL USING (user_id = auth.uid());
        END IF;
        
        -- Add policy for venue owners to view bookings for their venues if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Venue owners can view their venue bookings') THEN
            CREATE POLICY "Venue owners can view their venue bookings" ON bookings
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM venues
                        WHERE venues.id = bookings.venue_id
                        AND venues.owner_id = auth.uid()
                    )
                );
        END IF;
    END IF;
END $$;

-- Venue Images: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_images') THEN
        -- Add policy for public read access if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_images' AND policyname = 'Venue images are viewable by everyone') THEN
            CREATE POLICY "Venue images are viewable by everyone" ON venue_images
                FOR SELECT USING (true);
        END IF;
        
        -- Add policy for venue owners to manage images if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_images' AND policyname = 'Venue owners can manage their venue images') THEN
            CREATE POLICY "Venue owners can manage their venue images" ON venue_images
                FOR ALL USING (
                    EXISTS (
                        SELECT 1 FROM venues
                        WHERE venues.id = venue_images.venue_id
                        AND venues.owner_id = auth.uid()
                    )
                );
        END IF;
    END IF;
END $$;

-- Venue Tables: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_tables') THEN
        -- Add policy for public read access if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_tables' AND policyname = 'Venue tables are viewable by everyone') THEN
            CREATE POLICY "Venue tables are viewable by everyone" ON venue_tables
                FOR SELECT USING (true);
        END IF;
        
        -- Add policy for venue owners to manage tables if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_tables' AND policyname = 'Venue owners can manage their venue tables') THEN
            CREATE POLICY "Venue owners can manage their venue tables" ON venue_tables
                FOR ALL USING (
                    EXISTS (
                        SELECT 1 FROM venues
                        WHERE venues.id = venue_tables.venue_id
                        AND venues.owner_id = auth.uid()
                    )
                );
        END IF;
    END IF;
END $$;

-- Venue Reviews: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_reviews') THEN
        -- Add policy for public read access if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_reviews' AND policyname = 'Reviews are viewable by everyone') THEN
            CREATE POLICY "Reviews are viewable by everyone" ON venue_reviews
                FOR SELECT USING (true);
        END IF;
        
        -- Add policy for authenticated users to create reviews if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_reviews' AND policyname = 'Authenticated users can create reviews') THEN
            CREATE POLICY "Authenticated users can create reviews" ON venue_reviews
                FOR INSERT WITH CHECK (user_id = auth.uid());
        END IF;
        
        -- Add policy for users to manage their own reviews if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_reviews' AND policyname = 'Users can manage their own reviews') THEN
            CREATE POLICY "Users can manage their own reviews" ON venue_reviews
                FOR ALL USING (user_id = auth.uid());
        END IF;
    END IF;
END $$;

-- Venue Amenities: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_amenities') THEN
        -- Add policy for public read access if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_amenities' AND policyname = 'Venue amenities are viewable by everyone') THEN
            CREATE POLICY "Venue amenities are viewable by everyone" ON venue_amenities
                FOR SELECT USING (true);
        END IF;
        
        -- Add policy for venue owners to manage amenities if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_amenities' AND policyname = 'Venue owners can manage their venue amenities') THEN
            CREATE POLICY "Venue owners can manage their venue amenities" ON venue_amenities
                FOR ALL USING (
                    EXISTS (
                        SELECT 1 FROM venues
                        WHERE venues.id = venue_amenities.venue_id
                        AND venues.owner_id = auth.uid()
                    )
                );
        END IF;
    END IF;
END $$;

-- User Profiles: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        -- Add policy for users to view their own profile if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view own profile') THEN
            CREATE POLICY "Users can view own profile" ON user_profiles
                FOR SELECT USING (id = auth.uid());
        END IF;
        
        -- Add policy for users to update their own profile if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile') THEN
            CREATE POLICY "Users can update own profile" ON user_profiles
                FOR UPDATE USING (id = auth.uid());
        END IF;
        
        -- Add policy for users to insert their own profile if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can insert own profile') THEN
            CREATE POLICY "Users can insert own profile" ON user_profiles
                FOR INSERT WITH CHECK (id = auth.uid());
        END IF;
    END IF;
END $$;

-- Saved Venues: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_venues') THEN
        -- Add policy for users to manage their own saved venues if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_venues' AND policyname = 'Users can manage own saved venues') THEN
            CREATE POLICY "Users can manage own saved venues" ON saved_venues
                FOR ALL USING (user_id = auth.uid());
        END IF;
    END IF;
END $$;

-- User Bookings: Ensure comprehensive policies (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bookings') THEN
        -- Add policy for users to manage their own bookings if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_bookings' AND policyname = 'Users can manage own bookings') THEN
            CREATE POLICY "Users can manage own bookings" ON user_bookings
                FOR ALL USING (user_id = auth.uid());
        END IF;
    END IF;
END $$;

-- User Preferences: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
        -- Add policy for users to manage their own preferences if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can manage own preferences') THEN
            CREATE POLICY "Users can manage own preferences" ON user_preferences
                FOR ALL USING (user_id = auth.uid());
        END IF;
    END IF;
END $$;

-- Split Payment Requests: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'split_payment_requests') THEN
        -- Add policy for users to view their own split payment requests if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'split_payment_requests' AND policyname = 'Users can view their own split payment requests') THEN
            CREATE POLICY "Users can view their own split payment requests" ON split_payment_requests
                FOR SELECT USING (
                    requester_id = auth.uid() OR 
                    recipient_id = auth.uid() OR
                    recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
                );
        END IF;
        
        -- Add policy for users to create split payment requests if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'split_payment_requests' AND policyname = 'Users can create split payment requests') THEN
            CREATE POLICY "Users can create split payment requests" ON split_payment_requests
                FOR INSERT WITH CHECK (requester_id = auth.uid());
        END IF;
        
        -- Add policy for users to update their own split payment requests if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'split_payment_requests' AND policyname = 'Users can update their own split payment requests') THEN
            CREATE POLICY "Users can update their own split payment requests" ON split_payment_requests
                FOR UPDATE USING (
                    requester_id = auth.uid() OR 
                    recipient_id = auth.uid()
                );
        END IF;
    END IF;
END $$;

-- Payment Notifications: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_notifications') THEN
        -- Add policy for users to view their own notifications if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_notifications' AND policyname = 'Users can view their own notifications') THEN
            CREATE POLICY "Users can view their own notifications" ON payment_notifications
                FOR SELECT USING (user_id = auth.uid());
        END IF;
        
        -- Add policy for system to create notifications if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_notifications' AND policyname = 'System can create notifications') THEN
            CREATE POLICY "System can create notifications" ON payment_notifications
                FOR INSERT WITH CHECK (true);
        END IF;
        
        -- Add policy for users to update their own notifications if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_notifications' AND policyname = 'Users can update their own notifications') THEN
            CREATE POLICY "Users can update their own notifications" ON payment_notifications
                FOR UPDATE USING (user_id = auth.uid());
        END IF;
    END IF;
END $$;

-- Rate Limits: Ensure comprehensive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits') THEN
        -- Add policy for users to manage their own rate limits if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rate_limits' AND policyname = 'Users can manage their own rate limits') THEN
            CREATE POLICY "Users can manage their own rate limits" ON rate_limits
                FOR ALL USING (user_id = auth.uid());
        END IF;
    END IF;
END $$;

-- Create a function to check RLS status for all tables
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE (
    table_name text,
    rls_enabled boolean,
    policy_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::text,
        t.rls_enabled,
        COALESCE(p.policy_count, 0)::bigint
    FROM (
        SELECT 
            schemaname,
            tablename as table_name,
            rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
    ) t
    LEFT JOIN (
        SELECT 
            schemaname,
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename
    ) p ON t.schemaname = p.schemaname AND t.table_name = p.tablename
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_rls_status() TO authenticated;
GRANT EXECUTE ON FUNCTION check_rls_status() TO anon;

-- Create a function to get RLS policy details for a specific table
CREATE OR REPLACE FUNCTION get_table_policies(p_table_name text)
RETURNS TABLE (
    policy_name text,
    operation text,
    definition text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.policyname::text as policy_name,
        p.cmd::text as operation,
        p.qual::text as definition
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    AND p.tablename = p_table_name
    ORDER BY p.policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_table_policies(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_policies(text) TO anon;

-- Add comments for documentation
COMMENT ON FUNCTION check_rls_status() IS 'Check RLS status for all public tables';
COMMENT ON FUNCTION get_table_policies(text) IS 'Get RLS policies for a specific table'; 