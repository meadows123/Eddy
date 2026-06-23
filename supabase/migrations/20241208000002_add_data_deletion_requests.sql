-- Create data deletion requests table for tracking deletion requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    deletion_reason TEXT,
    data_types_deleted TEXT[] NOT NULL DEFAULT '{}',
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'venue_owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for data deletion requests
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own deletion requests
CREATE POLICY "Users can insert their own deletion requests"
    ON data_deletion_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
    ON data_deletion_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_deleted_at ON data_deletion_requests(deleted_at);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_type ON data_deletion_requests(user_type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_data_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_data_deletion_requests_updated_at
    BEFORE UPDATE ON data_deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_data_deletion_requests_updated_at();

-- Add comment to table
COMMENT ON TABLE data_deletion_requests IS 'Tracks data deletion requests for GDPR compliance and audit purposes';
COMMENT ON COLUMN data_deletion_requests.data_types_deleted IS 'Array of data types that were deleted (profile, bookings, payments, etc.)';
COMMENT ON COLUMN data_deletion_requests.user_type IS 'Type of user (customer or venue_owner)';