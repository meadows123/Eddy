-- Enable RLS on all existing tables that don't have it enabled yet
-- Based on the current database state where most tables have policies but RLS is disabled

-- Enable RLS on tables that currently have policies but RLS disabled
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

-- Note: profiles and venue_owners already have RLS enabled, so we don't need to enable them

-- Verify RLS is now enabled on all tables
DO $$
DECLARE
    table_record RECORD;
    disabled_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check which tables still don't have RLS enabled
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
        AND rowsecurity = false
    LOOP
        disabled_tables := array_append(disabled_tables, table_record.tablename);
    END LOOP;
    
    -- Report any tables that still don't have RLS enabled
    IF array_length(disabled_tables, 1) > 0 THEN
        RAISE NOTICE 'Tables without RLS enabled: %', array_to_string(disabled_tables, ', ');
    ELSE
        RAISE NOTICE 'All tables now have RLS enabled!';
    END IF;
END $$; 