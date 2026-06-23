-- Allow public access to read bookings for availability checking
-- This is needed so non-authenticated users can see which time slots are booked

-- Add policy for public read access to bookings (for availability checking only)
DO $$
BEGIN
    -- Only add if the policy doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND policyname = 'Public can read bookings for availability'
    ) THEN
        CREATE POLICY "Public can read bookings for availability"
            ON bookings FOR SELECT
            USING (
                status IN ('confirmed', 'pending', 'paid')
                AND booking_date >= CURRENT_DATE
            );
    END IF;
END $$;

-- Also ensure venue_tables are publicly readable for availability checking
DO $$
BEGIN
    -- Only add if the policy doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'venue_tables' 
        AND policyname = 'Venue tables are viewable by everyone'
    ) THEN
        CREATE POLICY "Venue tables are viewable by everyone"
            ON venue_tables FOR SELECT
            USING (true);
    END IF;
END $$;
