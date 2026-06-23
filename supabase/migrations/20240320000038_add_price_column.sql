-- Add price column to venue_tables if it doesn't exist
-- This migration ensures the price column is available for table management

-- Check if price column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'venue_tables' 
        AND column_name = 'price'
    ) THEN
        -- Add the price column
        ALTER TABLE venue_tables ADD COLUMN price decimal(10,2) DEFAULT 50.00;
        RAISE NOTICE 'Added price column to venue_tables';
    ELSE
        RAISE NOTICE 'Price column already exists in venue_tables';
    END IF;
END $$;

-- Update existing tables with default pricing if they don't have a price
UPDATE venue_tables 
SET price = 50.00 
WHERE price IS NULL;

-- Create index for price queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_venue_tables_price ON venue_tables(price);

-- Verify the column was added
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE '=== venue_tables columns after migration ===';
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'venue_tables' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % (% type, nullable: %, default: %)', 
            col_record.column_name, 
            col_record.data_type,
            col_record.is_nullable,
            COALESCE(col_record.column_default, 'NULL');
    END LOOP;
END $$;
