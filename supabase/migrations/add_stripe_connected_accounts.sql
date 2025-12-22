-- Add Stripe connected account columns to venue_owners table
-- This migration adds support for Stripe Connected Accounts

-- Step 1: Add columns if they don't exist
ALTER TABLE venue_owners
ADD COLUMN IF NOT EXISTS stripe_connected_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_access_token TEXT;

-- Step 2: Add index for faster lookups by connected account ID
CREATE INDEX IF NOT EXISTS idx_venue_owners_stripe_connected_id 
ON venue_owners(stripe_connected_account_id);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN venue_owners.stripe_connected_account_id IS 'Stripe User ID (acct_...) for this venue owner''s connected account';
COMMENT ON COLUMN venue_owners.stripe_access_token IS 'OAuth access token for Stripe API access (if needed)';

-- Step 4: Verify the columns exist (optional - for debugging)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name='venue_owners' 
-- AND column_name IN ('stripe_connected_account_id', 'stripe_access_token');

