-- Add missing columns to profiles table for QR code functionality
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS member_tier TEXT DEFAULT 'VIP',
ADD COLUMN IF NOT EXISTS qr_security_code TEXT,
ADD COLUMN IF NOT EXISTS last_qr_generated TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_visit TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_venue_visited UUID;

-- Add foreign key constraint for last_venue_visited
ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_last_venue_visited 
FOREIGN KEY (last_venue_visited) REFERENCES venues(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_qr_security_code ON profiles(qr_security_code);
CREATE INDEX IF NOT EXISTS idx_profiles_member_tier ON profiles(member_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_last_visit ON profiles(last_visit);
CREATE INDEX IF NOT EXISTS idx_profiles_last_venue_visited ON profiles(last_venue_visited);
