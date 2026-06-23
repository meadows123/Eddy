-- Add refund tracking fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'none' CHECK (refund_status IN ('none', 'processing', 'refunded', 'failed', 'no_payment')),
ADD COLUMN IF NOT EXISTS refund_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);

-- Create index for refund queries
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status ON bookings(refund_status);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at);
