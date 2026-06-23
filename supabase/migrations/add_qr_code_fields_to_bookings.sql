-- Add QR code fields to bookings table
-- This migration adds fields to track QR code generation and scanning

-- Add QR code related fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS qr_code_scan_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_scan_by TEXT,
ADD COLUMN IF NOT EXISTS qr_security_code TEXT;

-- Create index on qr_security_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_qr_security_code ON bookings(qr_security_code);

-- Create index on booking_date and status for efficient queries
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);

-- Add comment to document the new fields
COMMENT ON COLUMN bookings.qr_code_scan_count IS 'Number of times the QR code has been scanned';
COMMENT ON COLUMN bookings.last_scan_at IS 'Timestamp of the last QR code scan';
COMMENT ON COLUMN bookings.last_scan_by IS 'Who performed the last scan (venue_owner, staff, etc.)';
COMMENT ON COLUMN bookings.qr_security_code IS 'Unique security code embedded in the QR code for validation';
