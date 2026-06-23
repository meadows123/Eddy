-- Add a database function to check if booking can be cancelled (24-hour policy)
CREATE OR REPLACE FUNCTION can_cancel_booking(booking_row bookings)
RETURNS BOOLEAN AS $$
DECLARE
    booking_datetime TIMESTAMP WITH TIME ZONE;
    hours_until_booking NUMERIC;
BEGIN
    -- Combine booking_date and start_time to get full datetime
    booking_datetime := (booking_row.booking_date || ' ' || booking_row.start_time)::TIMESTAMP WITH TIME ZONE;
    
    -- Calculate hours until booking
    hours_until_booking := EXTRACT(EPOCH FROM (booking_datetime - NOW())) / 3600;
    
    -- Allow cancellation only if more than 24 hours away
    RETURN hours_until_booking >= 24;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a policy that prevents updates to cancelled status within 24 hours
DO $$
BEGIN
    -- Add policy to prevent cancellation within 24 hours
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Prevent cancellation within 24 hours') THEN
        CREATE POLICY "Prevent cancellation within 24 hours" ON bookings
            FOR UPDATE USING (
                -- Allow updates if not changing to cancelled status
                (NEW.status IS DISTINCT FROM 'cancelled') OR
                -- Allow cancellation if more than 24 hours away
                can_cancel_booking(bookings) OR
                -- Always allow venue owners and admins to cancel
                EXISTS (
                    SELECT 1 FROM venues
                    WHERE venues.id = bookings.venue_id
                    AND venues.owner_id = auth.uid()
                ) OR
                -- Allow service role (for edge functions)
                auth.role() = 'service_role'
            );
    END IF;
END $$;

-- Add a trigger to automatically check cancellation policy
CREATE OR REPLACE FUNCTION check_cancellation_policy()
RETURNS TRIGGER AS $$
DECLARE
    booking_datetime TIMESTAMP WITH TIME ZONE;
    hours_until_booking NUMERIC;
BEGIN
    -- Only check if status is being changed to cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Skip check for service role (edge functions)
        IF current_setting('role', true) = 'service_role' THEN
            RETURN NEW;
        END IF;
        
        -- Combine booking_date and start_time
        booking_datetime := (NEW.booking_date || ' ' || NEW.start_time)::TIMESTAMP WITH TIME ZONE;
        
        -- Calculate hours until booking
        hours_until_booking := EXTRACT(EPOCH FROM (booking_datetime - NOW())) / 3600;
        
        -- Prevent cancellation if less than 24 hours
        IF hours_until_booking < 24 THEN
            RAISE EXCEPTION 'Cancellation not allowed: Only bookings with 24+ hours notice can be cancelled automatically. Please contact support for assistance.'
                USING ERRCODE = 'P0001',
                      HINT = 'Bookings can only be cancelled up to 24 hours before the scheduled time.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_cancellation_policy ON bookings;
CREATE TRIGGER enforce_cancellation_policy
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION check_cancellation_policy();

-- Add helpful comments
COMMENT ON FUNCTION can_cancel_booking(bookings) IS 'Checks if a booking can be cancelled based on 24-hour policy';
COMMENT ON FUNCTION check_cancellation_policy() IS 'Trigger function to enforce 24-hour cancellation policy';
COMMENT ON TRIGGER enforce_cancellation_policy ON bookings IS 'Prevents booking cancellations within 24 hours of scheduled time';
