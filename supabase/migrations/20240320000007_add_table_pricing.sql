-- Add pricing fields to venue_tables table
ALTER TABLE venue_tables 
ADD COLUMN price_per_hour decimal(10,2) DEFAULT 50.00,
ADD COLUMN minimum_spend decimal(10,2) DEFAULT 0.00,
ADD COLUMN is_active boolean DEFAULT true;

-- Update existing tables with default pricing based on table type
UPDATE venue_tables 
SET price_per_hour = CASE 
    WHEN table_type = 'bar' THEN 30.00
    WHEN table_type = 'outdoor' THEN 40.00 
    WHEN table_type = 'indoor' THEN 50.00
    ELSE 50.00
END;

UPDATE venue_tables 
SET minimum_spend = CASE 
    WHEN table_type = 'bar' THEN 100.00
    WHEN table_type = 'outdoor' THEN 150.00
    WHEN table_type = 'indoor' THEN 200.00
    ELSE 150.00
END;

-- Add indexes for pricing queries
CREATE INDEX idx_venue_tables_price ON venue_tables(price_per_hour);
CREATE INDEX idx_venue_tables_active ON venue_tables(is_active);

-- Update RLS policies for venue_tables
-- Venue tables: Anyone can read, only venue owners can write
create policy "Venue tables are viewable by everyone"
    on venue_tables for select
    using (true);

create policy "Venue tables are editable by venue owner"
    on venue_tables for all
    using (
        exists (
            select 1 from venues
            where venues.id = venue_tables.venue_id
            and venues.owner_id = auth.uid()
        )
    );