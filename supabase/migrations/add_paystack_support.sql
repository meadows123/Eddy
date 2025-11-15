-- Add Paystack support to venue_owners table
-- This migration adds fields for Paystack subaccount integration

-- Step 1: Add Paystack fields to venue_owners table
ALTER TABLE venue_owners
ADD COLUMN IF NOT EXISTS paystack_subaccount_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS paystack_bank_account VARCHAR(50),
ADD COLUMN IF NOT EXISTS paystack_bank_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS paystack_account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS paystack_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paystack_connected_at TIMESTAMP;

-- Step 2: Add Paystack fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS paystack_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS paystack_split_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL,
ADD COLUMN IF NOT EXISTS venue_owner_amount DECIMAL;

-- Step 3: Create paystack_splits table
CREATE TABLE IF NOT EXISTS paystack_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  paystack_split_id VARCHAR(255) UNIQUE,
  
  -- Split configuration
  total_amount DECIMAL NOT NULL,
  platform_fee_amount DECIMAL NOT NULL,
  platform_fee_percentage DECIMAL NOT NULL,
  
  -- Recipients (JSON array with {subaccount_id, share, amount})
  recipients JSONB,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
  paystack_response JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  
  -- Indexing for performance
  CONSTRAINT status_check CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Step 4: Create paystack_subaccounts table
CREATE TABLE IF NOT EXISTS paystack_subaccounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_owner_id UUID REFERENCES venue_owners(id) ON DELETE CASCADE,
  paystack_subaccount_id VARCHAR(255) UNIQUE NOT NULL,
  
  bank_account VARCHAR(50) NOT NULL,
  bank_code VARCHAR(10) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_venue_owners_paystack_connected 
ON venue_owners(paystack_connected);

CREATE INDEX IF NOT EXISTS idx_venue_owners_paystack_subaccount 
ON venue_owners(paystack_subaccount_id);

CREATE INDEX IF NOT EXISTS idx_bookings_paystack_reference 
ON bookings(paystack_reference);

CREATE INDEX IF NOT EXISTS idx_paystack_splits_booking 
ON paystack_splits(booking_id);

CREATE INDEX IF NOT EXISTS idx_paystack_splits_status 
ON paystack_splits(status);

CREATE INDEX IF NOT EXISTS idx_paystack_subaccounts_venue_owner 
ON paystack_subaccounts(venue_owner_id);

-- Step 6: Create view for venue owner payouts (helpful for dashboard)
CREATE OR REPLACE VIEW venue_owner_payouts AS
SELECT 
  vo.id as venue_owner_id,
  vo.user_id,
  v.name as venue_name,
  COUNT(DISTINCT ps.booking_id) as payment_count,
  SUM(CASE WHEN ps.status = 'completed' THEN ps.total_amount * (100 - ps.platform_fee_percentage) / 100 ELSE 0 END) as total_earned,
  SUM(CASE WHEN ps.status = 'pending' THEN ps.total_amount * (100 - ps.platform_fee_percentage) / 100 ELSE 0 END) as pending_amount,
  MAX(ps.completed_at) as last_payout_date
FROM venue_owners vo
LEFT JOIN venues v ON v.owner_id = vo.user_id
LEFT JOIN paystack_splits ps ON ps.id::text IN (
  SELECT jsonb_array_elements(ps2.recipients)->>'split_id'
  FROM paystack_splits ps2
)
WHERE vo.paystack_connected = true
GROUP BY vo.id, vo.user_id, v.name;

-- Step 7: Add comment for documentation
COMMENT ON TABLE paystack_splits IS 'Tracks Paystack split payments with fee deduction before distribution';
COMMENT ON TABLE paystack_subaccounts IS 'Stores Paystack subaccount information for venue owners';
COMMENT ON COLUMN paystack_splits.platform_fee_percentage IS 'Percentage of transaction taken as platform fee (e.g., 10 for 10%)';
COMMENT ON COLUMN paystack_splits.recipients IS 'JSON array: [{subaccount_id: string, share: number, amount: number}, ...]';
COMMENT ON COLUMN venue_owners.paystack_subaccount_id IS 'Paystack subaccount ID for this venue owner (acct_xxx format)';

