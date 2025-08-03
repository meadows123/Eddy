-- Create split payment requests table
CREATE TABLE IF NOT EXISTS split_payment_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    payment_link VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for payment requests
CREATE TABLE IF NOT EXISTS payment_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    split_payment_id UUID REFERENCES split_payment_requests(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'payment_request',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_split_payment_requests_booking_id ON split_payment_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_split_payment_requests_requester_id ON split_payment_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_split_payment_requests_recipient_id ON split_payment_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_split_payment_requests_status ON split_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_user_id ON payment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_is_read ON payment_notifications(is_read);

-- Enable RLS
ALTER TABLE split_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for split_payment_requests
CREATE POLICY "Users can view their own split payment requests" ON split_payment_requests
    FOR SELECT USING (
        requester_id = auth.uid() OR 
        recipient_id = auth.uid() OR
        recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can create split payment requests" ON split_payment_requests
    FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update their own split payment requests" ON split_payment_requests
    FOR UPDATE USING (
        requester_id = auth.uid() OR 
        recipient_id = auth.uid()
    );

-- RLS policies for payment_notifications
CREATE POLICY "Users can view their own notifications" ON payment_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON payment_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON payment_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_split_payment_requests_updated_at 
    BEFORE UPDATE ON split_payment_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 