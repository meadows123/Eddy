-- Create saved_venues table
CREATE TABLE IF NOT EXISTS saved_venues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can't save the same venue twice
    UNIQUE(user_id, venue_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_venues_user_id ON saved_venues(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_venues_venue_id ON saved_venues(venue_id);

-- Enable Row Level Security
ALTER TABLE saved_venues ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved venues" ON saved_venues
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save venues" ON saved_venues
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their saved venues" ON saved_venues
    FOR DELETE USING (auth.uid() = user_id); 