-- Add confirmed_at timestamp to bookings table
ALTER TABLE bookings 
ADD COLUMN confirmed_at timestamp with time zone,
ADD COLUMN qr_security_code varchar(8);

-- Add indexes for faster lookups
CREATE INDEX idx_bookings_confirmed_at ON bookings(confirmed_at);
CREATE INDEX idx_bookings_qr_security_code ON bookings(qr_security_code);

COMMENT ON COLUMN bookings.confirmed_at IS 'Timestamp when the booking was confirmed';
COMMENT ON COLUMN bookings.qr_security_code IS 'Security code for QR code verification';
