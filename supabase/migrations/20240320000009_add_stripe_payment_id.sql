-- Add stripe_payment_id column to split_payment_requests table
ALTER TABLE split_payment_requests 
ADD COLUMN stripe_payment_id VARCHAR(255);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_split_payment_requests_stripe_id ON split_payment_requests(stripe_payment_id); 